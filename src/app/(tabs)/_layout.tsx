import { Tabs } from "expo-router/js-tabs";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import { ToastHost } from "@/components/ui/composite/toast-host";
import { useTheme } from "@/theme/use-theme";

/**
 * The three V3 tabs (HAB-27, D2): Today, Progress, Habits. Each tab is a
 * *group* of the one shared stack in `(today,progress,habits)/`, so Detail
 * pushes inside the tab it came from (ADR 006).
 *
 * No screen draws this navigator's own header bar — every screen title is
 * screen content (V3-02). The floating pill (V3-01 B) replaces this standard
 * bar in the next step.
 *
 * One toast slot for the whole shell, so a confirmation outlives both the
 * screen and the tab that raised it (archive on Detail → toast on Today).
 * It sits here and not in the shared stack, which is mounted once per tab.
 */
export default function TabsLayout() {
	const { colors } = useTheme();

	return (
		<View style={styles.root}>
			<Tabs
				screenOptions={{
					headerShown: false,
					tabBarStyle: {
						backgroundColor: colors.card,
						borderTopColor: colors.border,
					},
					tabBarActiveTintColor: colors.ink,
					tabBarInactiveTintColor: colors.faint,
				}}
			>
				<Tabs.Screen
					name="(today)"
					options={{
						title: "Today",
						tabBarIcon: ({ color }) => (
							<SymbolView name="checkmark.circle" size={22} tintColor={color} />
						),
					}}
				/>
				<Tabs.Screen
					name="(progress)"
					options={{
						title: "Progress",
						tabBarIcon: ({ color }) => (
							<SymbolView name="chart.bar" size={22} tintColor={color} />
						),
					}}
				/>
				<Tabs.Screen
					name="(habits)"
					options={{
						title: "Habits",
						tabBarIcon: ({ color }) => (
							<SymbolView name="list.bullet" size={22} tintColor={color} />
						),
					}}
				/>
			</Tabs>
			<ToastHost />
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
});
