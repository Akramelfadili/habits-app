import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useModalFormHeaderOptions } from "@/components/ui/composite/modal-form-header";
import { RootErrorBoundary } from "@/components/ui/composite/root-error-boundary";
import { DatabaseProvider } from "@/lib/db/database-provider";
import { SCHEMA_VERSION } from "@/lib/db/schema-version";
import { pinClockFromUrl } from "@/lib/dev-clock/pin-clock";
import { installGlobalHandlers } from "@/lib/logger/global-handlers";
import { installLogging } from "@/lib/logger/install";
import { log } from "@/lib/logger/logger";
import { configureNotificationHandler } from "@/lib/notifications/notifications";
import { useFirstRunSkipActions } from "@/modules/habits/hooks/use-first-run-skip-actions";
import { useStartupActions } from "@/modules/habits/hooks/use-startup-actions";
import {
	firstRunCopy,
	formCopy,
	migrationCopy,
	suggestionsCopy,
} from "@/modules/habits/messages";
import { DeviceValidationLaunch } from "@/modules/habits/screens/dev-state-screen";
import { loadThemePreference } from "@/theme/theme-preference";
import { useThemePreferenceStore } from "@/theme/theme-preference-store";
import { useTheme } from "@/theme/use-theme";
import { loadHapticsSetting } from "@/utils/use-haptics";

// First, before anything can throw: unhandled errors and promise rejections
// are logged (and still reach React Native's own handler — red box, fatal).
installLogging();
installGlobalHandlers();
log.info("app.start", { schemaVersion: SCHEMA_VERSION });

// Web fixture runs only (`?clock=`, dev) — before any screen reads "now".
pinClockFromUrl();

// Development builds only: applies the starter habits from .env.local before
// the first screen (docs/how-to/starter-habits.md). A `__DEV__ ? require(...)`
// is the only form that keeps the module — and the env value Expo inlines in
// it — out of a production bundle; check-architecture enforces it.
const StarterProfileGate: React.ComponentType<{
	children: React.ReactNode;
}> = __DEV__
	? require("@/modules/habits/screens/starter-profile-gate").StarterProfileGate
	: ({ children }) => children;

// Held until the saved Appearance choice is applied (ThemeGate) — otherwise a
// dark-mode user would see a light frame before the app repaints.
SplashScreen.preventAutoHideAsync().catch((error) =>
	log.warn("app.splash_hold_failed", { error }),
);

// Once, before anything can schedule, so reminders show while the app is open.
configureNotificationHandler();

/**
 * Renders nothing — and so keeps the splash up — until the stored Appearance
 * choice has been read and pushed to the native side. Sits inside
 * DatabaseProvider: the choice lives in the database, which is only readable
 * once migrations have run.
 */
function ThemeGate({ children }: { children: React.ReactNode }) {
	const isLoaded = useThemePreferenceStore((state) => state.isLoaded);

	useEffect(() => {
		void loadThemePreference();
		void loadHapticsSetting();
	}, []);

	useEffect(() => {
		if (isLoaded) SplashScreen.hide();
	}, [isLoaded]);

	return isLoaded ? children : null;
}

function StartupActions() {
	useStartupActions();
	return null;
}

// expo-router's route-level error boundary: anything that throws while rendering lands
// on the recovery screen instead of a blank app.
export { RootErrorBoundary as ErrorBoundary };

export default function RootLayout() {
	const { colors } = useTheme();
	const router = useRouter();
	const { skip } = useFirstRunSkipActions();
	// First Run's Close is a skip: First Run is marked seen and Today opens empty.
	const firstRunHabitHeaderOptions = useModalFormHeaderOptions(
		firstRunCopy.habit.title,
		formCopy.close,
		() => skip(router),
	);
	const suggestionsHeaderOptions = useModalFormHeaderOptions(
		suggestionsCopy.title,
		suggestionsCopy.close,
	);
	const newHabitHeaderOptions = useModalFormHeaderOptions(
		formCopy.newTitle,
		formCopy.close,
	);
	const editHabitHeaderOptions = useModalFormHeaderOptions(
		formCopy.editTitle,
		formCopy.close,
	);

	return (
		// Gesture handler needs one root view for any gesture in the app (drag-to-reorder and
		// swipe-to-archive in Manage & Archive).
		<GestureHandlerRootView style={styles.root}>
			<DatabaseProvider copy={migrationCopy}>
				<StarterProfileGate>
					<ThemeGate>
						{/* "auto" follows the resolved scheme, explicit Light/Dark included. */}
						<StatusBar style="auto" />
						<StartupActions />
						<DeviceValidationLaunch />
						<Stack
							screenOptions={{
								headerStyle: { backgroundColor: colors.bg },
								headerTintColor: colors.ink,
								headerTitleStyle: { color: colors.ink },
								headerShadowVisible: false,
								// No back-button config here: every header button, back
								// included, comes from components/ui/composite/header-buttons
								// (the system back button is never shown — iOS 26 glass).
							}}
						>
							<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
							{/* Device validation only (CI simulator build); anywhere else it redirects to Today. */}
							<Stack.Screen
								name="dev-state"
								options={{ headerShown: false, animation: "none" }}
							/>
							{/* First Run sits outside the tabs, so no tab bar is drawn; its welcome cannot be swiped away. */}
							<Stack.Screen
								name="first-run/index"
								options={{ headerShown: false, gestureEnabled: false }}
							/>
							<Stack.Screen
								name="first-run/habit"
								options={firstRunHabitHeaderOptions}
							/>
							{/*
							 * new-habit / edit-habit declare their modal header (title,
							 * suppressed back button, Cancel) statically here rather than via a
							 * <Stack.Screen> rendered inside the route — the navigator resolves
							 * presentation/back-button chrome for the push transition before
							 * the screen mounts, so a dynamically-registered override arrives
							 * too late and the system back chevron briefly or persistently
							 * shows instead.
							 */}
							<Stack.Screen name="new-habit" options={newHabitHeaderOptions} />
							{/* Browse suggestions: a modal from First Run, Today and Habits alike. */}
							<Stack.Screen
								name="suggestions"
								options={suggestionsHeaderOptions}
							/>
							<Stack.Screen
								name="edit-habit/[id]"
								options={editHabitHeaderOptions}
							/>
						</Stack>
					</ThemeGate>
				</StarterProfileGate>
			</DatabaseProvider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
});
