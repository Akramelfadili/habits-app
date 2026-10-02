import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useModalFormHeaderOptions } from "@/components/ui/composite/modal-form-header";
import { DatabaseProvider } from "@/lib/db/database-provider";
import { pinClockFromUrl } from "@/lib/dev-clock/pin-clock";
import { configureNotificationHandler } from "@/lib/notifications/notifications";
import { loadThemePreference } from "@/theme/theme-preference";
import { useThemePreferenceStore } from "@/theme/theme-preference-store";
import { useTheme } from "@/theme/use-theme";

// Web fixture runs only (`?clock=`, dev) — before any screen reads "now".
pinClockFromUrl();

// Held until the saved Appearance choice is applied (ThemeGate) — otherwise a
// dark-mode user would see a light frame before the app repaints.
void SplashScreen.preventAutoHideAsync();

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

export default function RootLayout() {
	const { colors } = useTheme();
	const newHabitHeaderOptions = useModalFormHeaderOptions("New habit");
	const editHabitHeaderOptions = useModalFormHeaderOptions("Edit habit");

	return (
		// Gesture handler needs one root view for any gesture in the app (Manage &
		// Archive's drag-to-reorder and swipe-to-archive, HAB-13).
		<GestureHandlerRootView style={styles.root}>
			<DatabaseProvider>
				<ThemeGate>
					{/* "auto" follows the resolved scheme, explicit Light/Dark included. */}
					<StatusBar style="auto" />
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
