import { Stack, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import { Container } from "@/components/ui/composite/container";
import { EmptyState } from "@/components/ui/composite/empty-state";
import { ListItem } from "@/components/ui/composite/list-item";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { formatDayMonth } from "@/utils/format";
import { ArchiveHabitSheet } from "../components/detail/archive-habit-sheet";
import { DeleteHabitSheet } from "../components/detail/delete-habit-sheet";
import { DetailActions } from "../components/detail/detail-actions";
import { DetailHeader } from "../components/detail/detail-header";
import { DetailHistory } from "../components/detail/detail-history";
import { WeekHistoryCard } from "../components/detail/week-history-card";
import { EditDaySheet } from "../components/edit-day-sheet";
import { ProgressStatTiles } from "../components/progress/progress-stat-tiles";
import { useHabitDetailActions } from "../hooks/use-habit-detail-actions";
import { useHabitDetailQueries } from "../hooks/use-habit-detail-queries";
import { useRetroLogQueries } from "../hooks/use-retro-log-queries";
import { detailCopy, messages, showMessage } from "../messages";
import {
	detailEyebrow,
	detailHeaderLabel,
	detailRemindersLabel,
	detailRemindersValue,
	detailTiles,
	gridLegend,
	gridRangeLabel,
	historyRowView,
	resetNotice,
	weekRows,
} from "../presenters/habit-detail-presenter";

type HabitDetailScreenProps = {
	habitId: number;
};

/** How far the title block scrolls before its name moves into the navigation bar. */
const TITLE_SCROLLED_AT = 96;

/**
 * Habit Detail: the header with Edit, the archived or restored banner, three stat tiles,
 * the last five weeks (each week one tap into Edit this day), Reminders, History by date,
 * and Archive and Delete last, each behind its own confirm sheet. Pushed from any tab, so
 * Back names the tab it came from; the habit's name joins the bar once the title scrolls away.
 */
export function HabitDetailScreen({ habitId }: HabitDetailScreenProps) {
	const { colors } = useTheme();
	const router = useRouter();
	const detail = useHabitDetailQueries(habitId);
	const [editDate, setEditDate] = useState<Date | null>(null);
	const editDay = useRetroLogQueries(habitId, editDate);
	const actions = useHabitDetailActions();
	const [archiveOpen, setArchiveOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [titleScrolled, setTitleScrolled] = useState(false);
	// Set before the delete runs: the habit leaves the live list a moment before
	// the pop, and Detail must not flash "Habit not found" in between.
	const deleting = useRef(false);

	const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) =>
		setTitleScrolled(nativeEvent.contentOffset.y > TITLE_SCROLLED_AT);

	// Still loading: a neutral blank, never a "not found" flash.
	if (detail === undefined) {
		return (
			<View
				testID="screen-loading"
				style={[styles.screen, { backgroundColor: colors.bg }]}
			/>
		);
	}

	if (!detail && deleting.current) {
		return (
			<View
				testID="screen-loading"
				style={[styles.screen, { backgroundColor: colors.bg }]}
			/>
		);
	}

	if (!detail) {
		return (
			<View style={[styles.screen, { backgroundColor: colors.bg }]}>
				<EmptyState
					icon="questionmark"
					headline={detailCopy.notFound.title}
					subtitle={detailCopy.notFound.body}
				/>
			</View>
		);
	}

	const { habit, today } = detail;
	const archived = habit.archivedAt !== null;

	// Archive pops Detail to where it was opened from and the toast offers Undo. A failed
	// write leaves everything as it was: the sheet stays, the hook has already shown the error
	// toast, and trying again is one tap.
	async function handleArchive() {
		const result = await actions.archiveHabit(habitId);
		if (!result.ok) return;
		setArchiveOpen(false);
		setDeleteOpen(false);
		showMessage(messages.habitArchived, [habit.name], () =>
			actions.restoreHabit(habitId),
		);
		router.back();
	}

	// Permanent, so the toast has no Undo. A failure stays in the sheet.
	async function handleDelete() {
		deleting.current = true;
		const result = await actions.deleteHabit(habitId);
		if (!result.ok) {
			deleting.current = false;
			return;
		}
		setDeleteOpen(false);
		showMessage(messages.habitDeleted, [habit.name]);
		router.back();
	}

	// Instant, no confirmation: it is fully reversible. Undo puts back the archive date and
	// pauses captured here, not a new archive dated today.
	async function handleRestore() {
		const { archivedAt, pauses } = habit;
		const result = await actions.restoreHabit(habitId);
		if (!result.ok) return;
		showMessage(messages.habitRestored, [habit.name], () =>
			actions.undoRestoreHabit(habitId, { archivedAt, pauses }),
		);
	}

	const tiles = detailTiles({
		habit,
		currentStreak: detail.currentStreak,
		longest: detail.longestStreak,
		rate: detail.completionRate,
		rateDelta: detail.rateDelta,
		freezesRemaining: detail.freezesRemaining,
		streakReset: detail.streakReset,
		hasEntries: detail.hasEntries,
		freshStart: detail.freshStart,
	});

	return (
		<ScrollView
			testID="habit-detail-scroll"
			style={[styles.screen, { backgroundColor: colors.bg }]}
			contentContainerStyle={styles.content}
			scrollEventThrottle={32}
			onScroll={onScroll}
		>
			<Stack.Screen options={{ title: titleScrolled ? habit.name : "" }} />
			<DetailHeader
				eyebrow={detailEyebrow(habit)}
				title={habit.name}
				accessibilityLabel={detailHeaderLabel(habit)}
				onEdit={() => router.push(`/edit-habit/${habit.id}`)}
			/>

			{archived && habit.archivedAt ? (
				<Banner
					tone="neutral"
					symbol="archivebox"
					title={detailCopy.banner.archivedTitle(
						formatDayMonth(habit.archivedAt),
					)}
					button={{
						label: detailCopy.banner.restore,
						onPress: handleRestore,
						disabled: actions.isRestoring,
					}}
				>
					{detailCopy.banner.archivedBody}
				</Banner>
			) : detail.restoredToday ? (
				<Banner
					tone="neutral"
					symbol="info.circle"
					title={detailCopy.banner.restoredTitle}
				>
					{detailCopy.banner.restoredBody}
				</Banner>
			) : null}

			<ProgressStatTiles tiles={tiles} />

			<WeekHistoryCard
				rangeLabel={gridRangeLabel(habit, today)}
				rows={weekRows(habit, detail.heatmapWeeks)}
				legend={gridLegend(habit, detail.heatmapWeeks)}
				notice={resetNotice(detail.streakReset)}
				onEditDay={setEditDate}
			/>

			<View style={styles.section}>
				<View accessible accessibilityRole="header" style={styles.label}>
					<SectionLabel>{detailCopy.reminders.header}</SectionLabel>
				</View>
				<Container variant="flat">
					<ListItem
						title={detailCopy.reminders.label}
						value={detailRemindersValue(habit, detail.reminders)}
						leading={<IconBadge symbol="bell" />}
						navigable
						accessibilityLabel={detailRemindersLabel(habit, detail.reminders)}
						onPress={() => router.push(`/reminders/${habit.id}`)}
					/>
				</Container>
			</View>

			<DetailHistory
				rows={detail.history.map((row) => historyRowView(habit, row))}
			/>

			<DetailActions
				canArchive={!archived}
				onArchive={() => setArchiveOpen(true)}
				onDelete={() => {
					actions.clearDeleteFailure();
					setDeleteOpen(true);
				}}
			/>

			<EditDaySheet day={editDay} onDismiss={() => setEditDate(null)} />
			<ArchiveHabitSheet
				visible={archiveOpen}
				habitName={habit.name}
				isArchiving={actions.isArchiving}
				onArchive={handleArchive}
				onCancel={() => setArchiveOpen(false)}
			/>
			<DeleteHabitSheet
				visible={deleteOpen}
				habitName={habit.name}
				logCount={detail.logCount}
				canArchive={!archived}
				isDeleting={actions.isDeleting}
				failed={actions.deleteFailed}
				onCancel={() => setDeleteOpen(false)}
				onArchive={handleArchive}
				onDelete={handleDelete}
			/>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: space[500],
		paddingTop: space[300],
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
		gap: space[300],
	},
	section: {
		gap: space[150],
	},
	label: {
		paddingHorizontal: space[100],
	},
});
