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
import { log } from "@/lib/logger/logger";
import { configureNotificationHandler } from "@/lib/notifications/notifications";
import { leaveFirstRun } from "@/modules/habits/first-run-navigation";
import { useFirstRunActions } from "@/modules/habits/hooks/use-first-run-actions";
import { useStartupActions } from "@/modules/habits/hooks/use-startup-actions";
import {
	firstRunCopy,
	formCopy,
	migrationCopy,
	suggestionsCopy,
} from "@/modules/habits/messages";
import { loadThemePreference } from "@/theme/theme-preference";
import { useThemePreferenceStore } from "@/theme/theme-preference-store";
import { useTheme } from "@/theme/use-theme";

// First, before anything can throw: unhandled errors and promise rejections
// are logged (and still reach React Native's own handler — red box, fatal).
installGlobalHandlers();
log.info("app", "start", { schemaVersion: SCHEMA_VERSION });

// Web fixture runs only (`?clock=`, dev) — before any screen reads "now".
pinClockFromUrl();

// Held until the saved Appearance choice is applied (ThemeGate) — otherwise a
// dark-mode user would see a light frame before the app repaints.
SplashScreen.preventAutoHideAsync().catch((error) =>
	log.warn("app", "could not hold the splash screen", error),
);

// Once, before anything can schedule — lets reminders (HAB-12) show while the app is open.
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
	}, []);

	useEffect(() => {
		if (isLoaded) SplashScreen.hide();
	}, [isLoaded]);

	return isLoaded ? children : null;
}

/** Renders nothing; runs the once-per-launch work once the database is ready. */
function StartupActions() {
	useStartupActions();
	return null;
}

// expo-router's route-level error boundary (audit A3-02): anything that throws
// while rendering lands on the recovery screen instead of a blank app.
export { RootErrorBoundary as ErrorBoundary };

export default function RootLayout() {
	const { colors } = useTheme();
	const router = useRouter();
	const { markFirstRunSeen } = useFirstRunActions();
	// FR2's Close is a skip: First Run is marked seen and Today opens empty (FR4).
	const firstRunHabitHeaderOptions = useModalFormHeaderOptions(
		firstRunCopy.habit.title,
		formCopy.close,
		async () => {
			const result = await markFirstRunSeen();
			if (result.ok) leaveFirstRun(router);
		},
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
		// Gesture handler needs one root view for any gesture in the app (Manage &
		// Archive's drag-to-reorder and swipe-to-archive, HAB-13).
		<GestureHandlerRootView style={styles.root}>
			<DatabaseProvider copy={migrationCopy}>
				<ThemeGate>
					{/* "auto" follows the resolved scheme, explicit Light/Dark included. */}
					<StatusBar style="auto" />
					<StartupActions />
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
						{/* First Run sits outside the tabs, so no tab bar is drawn (HAB-46); its welcome cannot be swiped away. */}
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
						{/* Browse suggestions (BS1): a modal from First Run, Today and Habits alike. */}
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
			</DatabaseProvider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
});
