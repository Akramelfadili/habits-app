import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/theme/use-theme";

export default function TabsLayout() {
	const { colors } = useTheme();

	return (
		<Tabs
			screenOptions={{
				headerStyle: { backgroundColor: colors.bg },
				headerTintColor: colors.ink,
				headerTitleStyle: { color: colors.ink },
				headerShadowVisible: false,
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
			<Tabs.Screen
				name="todos"
				options={{
					title: "To-dos",
					tabBarIcon: ({ color }) => (
						<SymbolView name="list.bullet" size={22} tintColor={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="expenses"
				options={{
					title: "Expenses",
					tabBarIcon: ({ color }) => (
						<SymbolView name="circle" size={22} tintColor={color} />
					),
				}}
			/>
		</Tabs>
	);
}
