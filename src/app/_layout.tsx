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

// First, before anything can throw; errors still reach React Native's own handler.
installLogging();
installGlobalHandlers();
log.info("app.start", { schemaVersion: SCHEMA_VERSION });

pinClockFromUrl();

// Only a `__DEV__ ? require(...)` keeps the module, and the env value Expo inlines in it, out of
// a production bundle; check-architecture enforces it.
const StarterProfileGate: React.ComponentType<{
	children: React.ReactNode;
}> = __DEV__
	? require("@/modules/habits/screens/starter-profile-gate").StarterProfileGate
	: ({ children }) => children;

// Held until the saved Appearance choice is applied, or a dark-mode user sees a light frame first.
SplashScreen.preventAutoHideAsync().catch((error) =>
	log.warn("app.splash_hold_failed", { error }),
);

configureNotificationHandler();

// Sits inside DatabaseProvider: the choice lives in the database, readable only after migrations.
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

export { RootErrorBoundary as ErrorBoundary };

export default function RootLayout() {
	const { colors } = useTheme();
	const router = useRouter();
	const { skip } = useFirstRunSkipActions();
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
		// Gesture handler needs one root view for any gesture in the app.
		<GestureHandlerRootView style={styles.root}>
			<DatabaseProvider copy={migrationCopy}>
				<StarterProfileGate>
					<ThemeGate>
						<StatusBar style="auto" />
						<StartupActions />
						<DeviceValidationLaunch />
						<Stack
							screenOptions={{
								headerStyle: { backgroundColor: colors.bg },
								headerTintColor: colors.ink,
								headerTitleStyle: { color: colors.ink },
								headerShadowVisible: false,
								// Header buttons, back included, come only from header-buttons (iOS 26 glass).
							}}
						>
							<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
							<Stack.Screen
								name="dev-state"
								options={{ headerShown: false, animation: "none" }}
							/>
							<Stack.Screen
								name="first-run/index"
								options={{ headerShown: false, gestureEnabled: false }}
							/>
							<Stack.Screen
								name="first-run/habit"
								options={firstRunHabitHeaderOptions}
							/>
							{/* Declared statically, not via <Stack.Screen> inside the route: the navigator resolves the
							    back-button chrome before the screen mounts, so a dynamic override arrives too late. */}
							<Stack.Screen name="new-habit" options={newHabitHeaderOptions} />
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
