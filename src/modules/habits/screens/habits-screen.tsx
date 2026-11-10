import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
	type HostInstance,
	Keyboard,
	type LayoutChangeEvent,
	StyleSheet,
	View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	CollapsedHeaderBar,
	collapseRange,
	HEADER_BLOCK_GAP,
	HEADER_CONTENT_PADDING_TOP,
	useCollapsingHeader,
} from "@/components/ui/composite/collapsing-header";
import { EmptyState } from "@/components/ui/composite/empty-state";
import {
	HeaderCircleButton,
	HeaderPillButton,
} from "@/components/ui/composite/header-buttons";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { Button } from "@/components/ui/primitives/button";
import { SearchField } from "@/components/ui/primitives/search-field";
import { space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useTabRetapToTop } from "@/utils/use-on-tab-retap";
import { ArchivedSection } from "../components/habits/archived-section";
import { CategoriesRow } from "../components/habits/categories-row";
import { HabitsHeader } from "../components/habits/habits-header";
import { HabitsLibrary } from "../components/habits/habits-library";
import { HabitsSearchResults } from "../components/habits/habits-search-results";
import { useHabitsActions } from "../hooks/use-habits-actions";
import { useHabitsQueries } from "../hooks/use-habits-queries";
import { habitsCopy, suggestionsCopy } from "../messages";
import {
	archivedRowLabel,
	archivedRowSubtitle,
	libraryCountsLabel,
	libraryEyebrow,
	matchHabits,
	searchTerm,
} from "../presenters/habits-library-presenter";
import type { Habit } from "../types";

// No bottom edge: the floating pill carries its own float over the home indicator and every scroller pays `TAB_BAR_BOTTOM_PADDING`.
const SCREEN_EDGES = ["top", "left", "right"] as const;

export function HabitsScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const library = useHabitsQueries();
	const actions = useHabitsActions();
	const header = useCollapsingHeader();
	const titleRef = useRef<HostInstance>(null);
	useTabRetapToTop("(habits)", header.scrollToTop, titleRef);
	const [query, setQuery] = useState("");
	const [reordering, setReordering] = useState(false);
	const [archivedOpen, setArchivedOpen] = useState(false);

	const openHabit = (habit: Habit) => router.push(`/habit/${habit.id}`);
	const addHabit = (name?: string) =>
		router.push(
			name ? { pathname: "/new-habit", params: { name } } : "/new-habit",
		);

	// The title row's bottom edge (plus the gap under it) is where the bar's
	// bottom edge has to end up, so the bar never covers the first thing below.
	const onHeaderLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) =>
		header.setRange(
			collapseRange(
				HEADER_CONTENT_PADDING_TOP +
					layout.y +
					layout.height +
					HEADER_BLOCK_GAP,
			),
		);

	if (!library.isLoaded) {
		return (
			<SafeAreaView
				edges={SCREEN_EDGES}
				testID="screen-loading"
				style={[styles.screen, { backgroundColor: colors.bg }]}
			/>
		);
	}

	const activeCount = library.active.length;
	const archivedCount = library.archived.length;
	const isEmpty = activeCount === 0 && archivedCount === 0;
	const searching = searchTerm(query) !== "";

	const archivedEntries = library.archived.flatMap((habit) =>
		habit.archivedAt
			? [
					{
						habit,
						subtitle: archivedRowSubtitle(
							habit.archivedAt,
							library.bestStreakByHabitId.get(habit.id) ?? 0,
						),
						accessibilityLabel: archivedRowLabel(habit),
					},
				]
			: [],
	);
	const activeMatches = matchHabits(
		library.active.map((habit) => ({ habit })),
		query,
	).map(({ habit }) => habit);
	const archivedMatches = matchHabits(archivedEntries, query);

	const endSearch = () => {
		setQuery("");
		Keyboard.dismiss();
	};

	const doneButton = (
		<HeaderPillButton
			label={habitsCopy.reorderDone}
			onPress={() => setReordering(false)}
		/>
	);
	const barButtons = reordering ? (
		doneButton
	) : (
		<View style={styles.barButtons}>
			<HeaderCircleButton
				symbol="gearshape"
				accessibilityLabel={habitsCopy.settings}
				onPress={() => router.push("/settings")}
			/>
			<HeaderCircleButton
				symbol="plus"
				accessibilityLabel={habitsCopy.addHabit}
				onPress={() => addHabit()}
			/>
		</View>
	);

	return (
		<SafeAreaView
			edges={SCREEN_EDGES}
			style={[styles.screen, { backgroundColor: colors.bg }]}
		>
			<CollapsedHeaderBar
				testID="habits-inline-bar"
				title={habitsCopy.screenTitle}
				collapsed={header.collapsed}
				backgroundStyle={header.barBackgroundStyle}
				contentStyle={header.barContentStyle}
				trailing={barButtons}
			/>
			<Animated.ScrollView
				ref={header.scrollRef}
				testID="habits-scroll"
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
				onScroll={header.onScroll}
				scrollEventThrottle={16}
			>
				<View onLayout={onHeaderLayout}>
					<HabitsHeader
						titleRef={titleRef}
						eyebrow={
							reordering
								? habitsCopy.eyebrow.reorder
								: libraryEyebrow(activeCount, archivedCount)
						}
						accessibilityLabel={habitsCopy.headerLabel(
							libraryCountsLabel(activeCount, archivedCount),
						)}
						reordering={reordering}
						onOpenSettings={() => router.push("/settings")}
						onAddHabit={() => addHabit()}
						onDone={() => setReordering(false)}
						animatedStyle={header.titleStyle}
						collapsed={header.collapsed}
					/>
				</View>

				{isEmpty ? (
					<EmptyState
						centered={false}
						icon="circle.dashed"
						headline={habitsCopy.empty.title}
						subtitle={habitsCopy.empty.body}
					>
						<Button
							fullWidth={false}
							label={habitsCopy.empty.add}
							onPress={() => addHabit()}
						/>
						<Button
							label={suggestionsCopy.browse}
							variant="link"
							onPress={() => router.push("/suggestions")}
						/>
					</EmptyState>
				) : (
					<>
						{reordering ? null : (
							<SearchField
								value={query}
								onChangeText={setQuery}
								label={habitsCopy.search.label}
								cancelLabel={habitsCopy.search.cancel}
								clearLabel={habitsCopy.search.clear}
								onCancel={endSearch}
							/>
						)}
						{searching ? (
							<HabitsSearchResults
								query={query}
								active={activeMatches}
								archived={archivedMatches}
								restoring={actions.isRestoring}
								onOpen={openHabit}
								onRestore={actions.restore}
								onAdd={addHabit}
							/>
						) : activeCount === 0 ? (
							<EmptyState
								centered={false}
								icon="circle.dashed"
								headline={habitsCopy.allArchived.title}
								subtitle={habitsCopy.allArchived.body}
							>
								<Button
									fullWidth={false}
									label={habitsCopy.empty.add}
									onPress={() => addHabit()}
								/>
							</EmptyState>
						) : (
							<HabitsLibrary
								groups={library.groups}
								active={library.active}
								streakByHabitId={library.streakByHabitId}
								reordering={reordering}
								onStartReorder={() => setReordering(true)}
								onReorder={actions.reorderHabits}
								onOpen={openHabit}
								onArchive={actions.archive}
							/>
						)}
					</>
				)}

				{reordering || searching ? null : (
					<>
						<ArchivedSection
							entries={archivedEntries}
							expanded={archivedOpen}
							onToggle={() => setArchivedOpen((open) => !open)}
							restoring={actions.isRestoring}
							onOpen={openHabit}
							onRestore={actions.restore}
						/>
						<CategoriesRow
							count={library.categoryCount}
							onPress={() => router.push("/categories?from=habits")}
						/>
					</>
				)}
			</Animated.ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: space[500],
		paddingTop: HEADER_CONTENT_PADDING_TOP,
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
		gap: space[300],
	},
	barButtons: {
		flexDirection: "row",
		gap: space[200],
	},
});
