import { Tabs } from "expo-router/js-tabs";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/theme/use-theme";

export default function TabsLayout() {
	const { colors } = useTheme();

	return (
		<Tabs
			screenOptions={{
				// None of the tab screens' mockups show this navigator's own header
				// bar (docs/mockups/today-populated.png's "Today" title is screen
				// content, not nav chrome) — first surfaced now that HAB-03 gives
				// the Habits tab a real mockup to check against.
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
				name="habits"
				options={{
					title: "Habits",
					tabBarIcon: ({ color }) => (
						<SymbolView name="square.grid.2x2" size={22} tintColor={color} />
					),
				}}
			/>
		</Tabs>
	);
}
