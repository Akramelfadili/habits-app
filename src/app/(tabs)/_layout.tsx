import { Tabs } from "expo-router/js-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/use-theme";

/** SPIKE: a custom tabBar on js-tabs, to prove `tabBar` is honoured at runtime. */
export default function TabsLayout() {
	const { colors } = useTheme();

	return (
		<Tabs
			screenOptions={{ headerShown: false }}
			tabBar={({ state, descriptors, emitter, navigateToTab, insets }) => (
				<View
					testID="spike-pill"
					style={[
						styles.pill,
						{
							backgroundColor: colors.pillBg,
							borderColor: colors.border,
							bottom: insets.bottom + 22,
						},
					]}
				>
					{state.routes.map((route, index) => {
						const focused = index === state.index;
						const label = descriptors[route.key]?.options.title ?? route.name;
						return (
							<Pressable
								key={route.key}
								testID={`spike-tab-${label}${focused ? "-active" : ""}`}
								accessibilityRole="button"
								accessibilityState={{ selected: focused }}
								style={[
									styles.item,
									focused && { backgroundColor: colors.inner },
								]}
								onPress={() => {
									const event = emitter.emit({
										type: "tabPress",
										target: route.key,
										canPreventDefault: true,
									});
									if (!focused && !event.defaultPrevented)
										navigateToTab(route.key);
								}}
							>
								<Text style={{ color: focused ? colors.ink : colors.sub }}>
									{label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			)}
		>
			<Tabs.Screen name="(today)" options={{ title: "Today" }} />
			<Tabs.Screen name="(progress)" options={{ title: "Progress" }} />
			<Tabs.Screen name="(habits)" options={{ title: "Habits" }} />
		</Tabs>
	);
}

const styles = StyleSheet.create({
	pill: {
		position: "absolute",
		left: 16,
		right: 16,
		height: 56,
		borderRadius: 999,
		borderWidth: 1,
		flexDirection: "row",
		padding: 4,
		gap: 2,
	},
	item: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 999,
	},
});
