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

/**
 * Each tab is a group of the one shared stack in `(today,progress,habits)/`, so Detail
 * pushes inside the tab it came from.
 * The bar is the floating pill through the navigator's `tabBar` prop. It is absolutely
 * positioned, so it takes no layout height and the screens (flex: 1 siblings) scroll under
 * it, each paying `TAB_BAR_BOTTOM_PADDING` at the bottom of its content.
 * No screen draws this navigator's own header bar: every screen title is screen content.
 * One toast slot for the whole shell, 12 pt above the pill, so a confirmation outlives
 * both the screen and the tab that raised it (archive on Detail, toast on Today). It sits
 * here and not in the shared stack, which is mounted once per tab.
 */

const TABS: Record<string, { label: string; icon: TabBarIconName }> = {
	"(today)": { label: "Today", icon: "today" },
	"(progress)": { label: "Progress", icon: "progress" },
	"(habits)": { label: "Habits", icon: "habits" },
};

export default function TabsLayout() {
	const insets = useSafeAreaInsets();
	// The toast sits 12 pt over the pill, 16 pt over bar A.
	const accessibilityTextSize = useAccessibilityTextSize();
	// A sheet's native Modal already covers the pill and dims it with the scrim; this also
	// stops it taking taps through, so there is no tab switching mid-decision. A native Alert
	// blocks touches by itself.
	// During the migration the pill does not exist yet: MigrationGate renders before the tabs do.
	const sheetOpen = useToastStore((state) => state.openSheets > 0);
	// First Run opens instead of the tabs (no habits and never seen), so the pill is never
	// drawn over it. An install that already has habits but predates the flag gets it written
	// once, so deleting every habit later can never bring First Run back.
	const { gate, needsSeenMark } = useFirstRunQueries();
	// Only First Run (and Browse suggestions from it, which are root routes outside this
	// layout) and its reminder question draw no bar. The empty Today is an ordinary tab root:
	// the bar stays, and Progress and Habits work with no habits.
	const offerOpen = useFirstRunOfferStore((state) => state.habit !== null);
	const hideBar = offerOpen;
	// Leaving First Run says so at once; the gate's live flag catches up a moment
	// later, and until it does the stale "never seen" must not redirect back.
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
									// The same press contract as the default bar: announce
									// `tabPress` first, so anything listening can prevent it.
									onPress: () => {
										const event = emitter.emit({
											type: "tabPress",
											target: route.key,
											canPreventDefault: true,
										});
										if (event.defaultPrevented) return;
										if (focused) {
											// The screen scrolls to the top and reads its title.
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
