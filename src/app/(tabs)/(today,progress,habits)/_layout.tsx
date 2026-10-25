import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { headerBackOptions } from "@/components/ui/composite/header-buttons";
import { ToastHost } from "@/components/ui/composite/toast-host";
import { useTheme } from "@/theme/use-theme";

/** SPIKE: one stack shared by the three tab groups; each group's root is its anchor. */
export const unstable_settings = {
	anchor: "index",
	progress: { anchor: "week" },
	habits: { anchor: "manage" },
};

const backTo =
	(title: string) =>
	({ navigation }: { navigation: { goBack: () => void } }) => ({
		title: "",
		...headerBackOptions({ title, onPress: () => navigation.goBack() }),
	});

export default function TabStackLayout() {
	const { colors } = useTheme();

	return (
		<View style={styles.root}>
			<Stack
				screenOptions={{
					headerStyle: { backgroundColor: colors.bg },
					headerTintColor: colors.ink,
					headerShadowVisible: false,
				}}
			>
				<Stack.Screen
					name="index"
					options={{ title: "Today", headerShown: false }}
				/>
				<Stack.Screen name="habit/[id]" options={backTo("Today")} />
				<Stack.Screen name="week" options={backTo("Today")} />
				<Stack.Screen name="month" options={backTo("Today")} />
				<Stack.Screen name="year" options={backTo("Today")} />
				<Stack.Screen name="reminders/[id]" options={backTo("")} />
				<Stack.Screen name="manage" options={backTo("Today")} />
				<Stack.Screen name="settings" options={backTo("Today")} />
				<Stack.Screen name="categories" options={backTo("Settings")} />
			</Stack>
			<ToastHost />
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
});
