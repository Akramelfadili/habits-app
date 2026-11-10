import { Stack } from "expo-router";
import { headerBackOptions } from "@/components/ui/composite/header-buttons";
import { useTheme } from "@/theme/use-theme";

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

// Set here, not only in the screen, so the system glass button never shows before a screen's own options arrive.
const backTo =
	(title: string) =>
	({ navigation }: { navigation: { goBack: () => void } }) => ({
		title: "",
		...headerBackOptions({ title, onPress: () => navigation.goBack() }),
	});

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
			<Stack.Screen name="progress" options={{ headerShown: false }} />
			<Stack.Screen name="manage" options={{ headerShown: false }} />
			<Stack.Screen name="habit/[id]" options={backTo(rootTitle)} />
			<Stack.Screen name="month/[month]" options={backTo("Year")} />
			<Stack.Screen name="reminders/[id]" options={backTo("")} />
			<Stack.Screen name="settings/index" options={backTo(rootTitle)} />
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
