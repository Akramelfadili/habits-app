import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	type TabBarIconName,
	TabBarPill,
	tabBarToastOffset,
} from "@/components/ui/composite/tab-bar-pill";
import { ToastHost } from "@/components/ui/composite/toast-host";
import { ToastRouteWatcher } from "@/components/ui/composite/toast-route-watcher";
import { useFirstRunOfferStore } from "@/modules/habits/first-run-offer-store";
import { useFirstRunActions } from "@/modules/habits/hooks/use-first-run-actions";
import { useFirstRunQueries } from "@/modules/habits/hooks/use-first-run-queries";
import { useTabRetapStore } from "@/store/tab-retap-store";
import { useToastStore } from "@/store/toast-store";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";

// The toast slot sits here, not in the shared stack (mounted once per tab), so a confirmation
// outlives both the screen and the tab that raised it.

const TABS: Record<string, { label: string; icon: TabBarIconName }> = {
	"(today)": { label: "Today", icon: "today" },
	"(progress)": { label: "Progress", icon: "progress" },
	"(habits)": { label: "Habits", icon: "habits" },
};

export default function TabsLayout() {
	const insets = useSafeAreaInsets();
	const accessibilityTextSize = useAccessibilityTextSize();
	// A sheet's native Modal covers the pill; this also stops taps going through, so no tab
	// switching mid-decision. A native Alert blocks touches by itself.
	const sheetOpen = useToastStore((state) => state.openSheets > 0);
	// An install that already has habits but predates the flag gets it written once, so deleting
	// every habit later can never bring First Run back.
	const { gate, needsSeenMark } = useFirstRunQueries();
	const offerOpen = useFirstRunOfferStore((state) => state.habit !== null);
	const hideBar = offerOpen;
	// The gate's live flag lags leaving First Run; until it catches up the stale "never seen" must not redirect back.
	const leftFirstRun = useFirstRunOfferStore((state) => state.leftFirstRun);
	const setLeftFirstRun = useFirstRunOfferStore(
		(state) => state.setLeftFirstRun,
	);
	useEffect(() => {
		if (leftFirstRun && gate === "done") setLeftFirstRun(false);
	}, [leftFirstRun, gate, setLeftFirstRun]);
	const { markFirstRunSeen } = useFirstRunActions();
	useEffect(() => {
		if (needsSeenMark) void markFirstRunSeen();
	}, [needsSeenMark, markFirstRunSeen]);
	if (gate === "first-run" && !leftFirstRun)
		return <Redirect href="/first-run" />;

	return (
		<View style={styles.root}>
			<Tabs
				screenOptions={{ headerShown: false }}
				tabBar={({ state, emitter, navigateToTab, insets: barInsets }) =>
					hideBar ? null : (
						<TabBarPill
							bottomInset={barInsets.bottom}
							disabled={sheetOpen}
							items={state.routes.map((route, index) => {
								const tab = TABS[route.name];
								const focused = index === state.index;
								return {
									key: route.key,
									label: tab?.label ?? route.name,
									icon: tab?.icon ?? "today",
									focused,
									// Same contract as the default bar: emit `tabPress` first so listeners can prevent it.
									onPress: () => {
										const event = emitter.emit({
											type: "tabPress",
											target: route.key,
											canPreventDefault: true,
										});
										if (event.defaultPrevented) return;
										if (focused) {
											useTabRetapStore.getState().retap(route.name);
										} else {
											navigateToTab(route.key);
										}
									},
								};
							})}
						/>
					)
				}
			>
				<Tabs.Screen name="(today)" options={{ title: "Today" }} />
				<Tabs.Screen name="(progress)" options={{ title: "Progress" }} />
				<Tabs.Screen name="(habits)" options={{ title: "Habits" }} />
			</Tabs>
			<ToastRouteWatcher />
			<ToastHost
				bottomOffset={tabBarToastOffset(insets.bottom, accessibilityTextSize)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
});
