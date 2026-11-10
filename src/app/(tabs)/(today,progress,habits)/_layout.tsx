import { Stack } from "expo-router";
import { headerBackOptions } from "@/components/ui/composite/header-buttons";
import { useTheme } from "@/theme/use-theme";

/**
 * One stack shared by the three tab groups. Each group picks its own root through the
 * anchors below, so Detail opens inside the tab it came from and Back returns to that tab.
 * New/Edit habit stay root-level modals (src/app/_layout.tsx); the toast host lives at
 * shell level, above the tab bar.
 */
export const unstable_settings = {
	anchor: "index",
	progress: { anchor: "progress" },
	habits: { anchor: "manage" },
};

const ROOT_TITLE: Record<string, string> = {
	"(today)": "Today",
	"(progress)": "Progress",
	"(habits)": "Habits",
};

/**
 * Plain back button via the shared header helper. Set here, not only in the screen, so
 * it is never the system glass button, even for the frame before a screen's own options arrive.
 */
const backTo =
	(title: string) =>
	({ navigation }: { navigation: { goBack: () => void } }) => ({
		title: "",
		...headerBackOptions({ title, onPress: () => navigation.goBack() }),
	});

/**
 * Reached from Settings and from the Habits tab's Categories row (`?from=habits`); Back
 * names the one it came from.
 */
const categoriesBack = ({
	navigation,
	route,
}: {
	navigation: { goBack: () => void };
	route: { params?: object };
}) => ({
	title: "",
	...headerBackOptions({
		title:
			(route.params as { from?: string } | undefined)?.from === "habits"
				? "Habits"
				: "Settings",
		onPress: () => navigation.goBack(),
	}),
});

export default function TabStackLayout({ segment }: { segment: string }) {
	const { colors } = useTheme();
	const rootTitle = ROOT_TITLE[segment] ?? "Today";

	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: colors.bg },
				headerTintColor: colors.ink,
				headerShadowVisible: false,
			}}
		>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			{/* Week / Month / Year are one screen with a range switcher: the Progress tab's root. */}
			<Stack.Screen name="progress" options={{ headerShown: false }} />
			<Stack.Screen name="manage" options={{ headerShown: false }} />
			{/* Pushed from any tab: Back names the tab it was opened from. */}
			<Stack.Screen name="habit/[id]" options={backTo(rootTitle)} />
			{/* A Year month label pushes its month here: Back (and the swipe) return to Year. */}
			<Stack.Screen name="month/[month]" options={backTo("Year")} />
			{/* A bare chevron until the screen relabels it with the habit's name. */}
			<Stack.Screen name="reminders/[id]" options={backTo("")} />
			{/* Settings opens from the Habits gear, but Reminders can reach it too. */}
			<Stack.Screen name="settings/index" options={backTo(rootTitle)} />
			{/* Its pages: Back reads Settings. */}
			<Stack.Screen name="settings/appearance" options={backTo("Settings")} />
			<Stack.Screen
				name="settings/evening-review"
				options={backTo("Settings")}
			/>
			<Stack.Screen
				name="settings/notifications"
				options={backTo("Settings")}
			/>
			<Stack.Screen name="settings/freezes" options={backTo("Settings")} />
			<Stack.Screen name="settings/about" options={backTo("Settings")} />
			<Stack.Screen name="categories" options={categoriesBack} />
		</Stack>
	);
}
