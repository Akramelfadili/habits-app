import { format } from "date-fns";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ColumnBars } from "@/components/ui/composite/column-bars";
import {
	CompletionGrid,
	type CompletionGridCell,
} from "@/components/ui/composite/completion-grid";
import { Container } from "@/components/ui/composite/container";
import { EmptyState } from "@/components/ui/composite/empty-state";
import { FreezePoolCard } from "@/components/ui/composite/freeze-pool-card";
import type { HeatmapCellState } from "@/components/ui/composite/heatmap-cell";
import { InsightCard } from "@/components/ui/composite/insight-card";
import { ListItem } from "@/components/ui/composite/list-item";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { StatCard } from "@/components/ui/composite/stat-card";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { TrendRow } from "@/components/ui/composite/trend-row";
import { UnlockCard } from "@/components/ui/composite/unlock-card";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { pluralise } from "@/utils/format";
import { categorySymbol } from "../components/category-symbol";
import { HabitBadge } from "../components/habit-badge";
import { RangeSwitcher } from "../components/range-switcher";
import { FREEZE_POOL_SIZE } from "../constants";
import type { MonthlyInsight } from "../domain/monthly-insights";
import type {
	CalendarDay,
	CalendarDayStatus,
	MonthlySummary,
} from "../domain/monthly-summary";
import { useMonthlySummaryQueries } from "../hooks/use-monthly-summary-queries";
import {
	freezeCardCopy,
	improvedCopy,
	insightCountLabel,
	monthlyTiles,
	monthRangeLabel,
	patternCopy,
	percent,
	previousMonthLabel,
	slippingCopy,
	slippingHabitId,
	trendRowLabel,
	unlockCopy,
} from "../presenters/monthly-summary-helpers";
import { weeklyMenuSubline } from "../presenters/weekly-summary-helpers";
import type { IsoWeekday } from "../types";

/**
 * Monthly Summary (HAB-16, frames C2/C3/C6): range switcher → Completed /
 * Perfect days / Freezes tiles → daily completion calendar → per-habit weekly
 * trend with a delta vs the previous month → ranked insights (max three) and
 * the freeze card. Opens on the current month (D15). Under 7 days of logs
 * it shows the unlock card and the partial current month instead — never a
 * locked wall.
 */
export function MonthlySummaryScreen() {
	const { colors } = useTheme();
	const view = useMonthlySummaryQueries();

	if (view.state === "loading") {
		return (
			<View
				testID="screen-loading"
				style={[styles.screen, { backgroundColor: colors.bg }]}
			/>
		);
	}

	if (view.state === "empty") {
		return (
			<View style={[styles.screen, { backgroundColor: colors.bg }]}>
				<View style={styles.emptyHeader}>
					<Header eyebrow="" />
				</View>
				<EmptyState
					icon="chart.bar"
					headline="Nothing to summarise yet"
					subtitle="Add a habit and its month will show up here."
				/>
			</View>
		);
	}

	if (view.state === "too-early") return <TooEarly view={view} />;
	return <Ready summary={view.summary} />;
}

function Header({
	eyebrow,
	switcher = false,
}: {
	eyebrow: string;
	switcher?: boolean;
}) {
	const { colors } = useTheme();
	return (
		<View style={styles.header}>
			{eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
			<Text
				accessibilityRole="header"
				style={[styles.title, { color: colors.ink }]}
			>
				Your month
			</Text>
			{switcher ? <RangeSwitcher value="month" /> : null}
		</View>
	);
}

function cellStateFor(status: CalendarDayStatus): HeatmapCellState {
	switch (status.kind) {
		case "level":
			return { kind: "level", level: status.level };
		case "missed":
			return { kind: "missed" };
		case "frozen":
			return { kind: "frozen" };
		case "none":
			return { kind: "not-scheduled" };
		default:
			return { kind: "outside" };
	}
}

const STATUS_LABEL: Record<CalendarDayStatus["kind"], string> = {
	"before-start": "before your first habit",
	future: "not logged yet",
	none: "nothing scheduled",
	frozen: "frozen",
	missed: "missed",
	level: "done",
};

function calendarRows(
	calendar: MonthlySummary["calendar"],
): (CompletionGridCell | null)[][] {
	return calendar.map((week) =>
		week.map((day: CalendarDay | null) =>
			day
				? {
						key: day.date.toISOString(),
						state: cellStateFor(day.status),
						accessibilityLabel: `${format(day.date, "EEEE d MMMM")}, ${STATUS_LABEL[day.status.kind]}`,
					}
				: null,
		),
	);
}

function Ready({ summary }: { summary: MonthlySummary }) {
	const router = useRouter();
	const { colors } = useTheme();
	const tiles = monthlyTiles(summary);
	const flaggedId = slippingHabitId(summary);
	const freeze = freezeCardCopy(summary);
	const monthName = format(summary.month.start, "MMMM");

	return (
		<ScrollView
			style={[styles.screen, { backgroundColor: colors.bg }]}
			contentContainerStyle={styles.content}
		>
			<Header eyebrow={monthRangeLabel(summary.month)} switcher />

			<View style={styles.stats}>
				<StatCard
					label="Completed"
					value={tiles.completed.value}
					caption={tiles.completed.caption}
					muted={summary.scheduled === 0}
				/>
				<StatCard
					label="Perfect days"
					value={tiles.perfect.value}
					caption={tiles.perfect.caption}
					muted={summary.perfectDays === 0}
				/>
				<StatCard
					label="Freezes"
					value={tiles.freezes.value}
					caption={tiles.freezes.caption}
					muted={summary.freezeDates.length === 0}
				/>
			</View>

			<Container>
				<SectionHeader
					title="Daily completion"
					size="small"
					count={`${summary.perfectDays} perfect days`}
				/>
				<CompletionGrid
					layout="month"
					accent={null}
					rows={calendarRows(summary.calendar)}
				/>
			</Container>

			<Container>
				<SectionHeader
					title="Per habit · weekly trend"
					size="small"
					count={previousMonthLabel(summary)}
				/>
				<View style={styles.rows}>
					{summary.rows.map((row) => (
						<TrendRow
							key={row.habit.id}
							label={row.habit.name}
							badge={<HabitBadge habit={row.habit} />}
							trend={
								<ColumnBars
									values={row.weeks.map((week) => week.fraction)}
									tone={row.habit.id === flaggedId ? "slipping" : "default"}
								/>
							}
							value={percent(row.rate)}
							deltaPoints={row.deltaPoints}
							accessibilityLabel={trendRowLabel(row)}
						/>
					))}
				</View>
			</Container>

			{/* A month with nothing counted (all frozen) has no insights — no header over nothing. */}
			{summary.insights.length > 0 ? (
				<>
					<SectionHeader
						title={`What ${monthName} says`}
						size="small"
						count={insightCountLabel(summary.insights.length)}
					/>
					{summary.insights.map((insight) => (
						<Insight
							key={insight.type}
							insight={insight}
							summary={summary}
							onEditFrequency={(id) =>
								router.push(`/edit-habit/${id}?focus=frequency`)
							}
							onOpenReminders={(id, weekday) =>
								router.push(`/reminders/${id}?addTime=${weekday}`)
							}
						/>
					))}
				</>
			) : null}
			{freeze ? (
				<FreezePoolCard
					poolSize={FREEZE_POOL_SIZE}
					used={freeze.used}
					title={freeze.title}
					body={freeze.body}
				/>
			) : null}
		</ScrollView>
	);
}

function Insight({
	insight,
	summary,
	onEditFrequency,
	onOpenReminders,
}: {
	insight: MonthlyInsight;
	summary: MonthlySummary;
	onEditFrequency: (habitId: number) => void;
	onOpenReminders: (habitId: number, weekday: IsoWeekday) => void;
}) {
	const { scheme } = useTheme();
	switch (insight.type) {
		case "slipping": {
			const copy = slippingCopy(insight);
			return (
				<InsightCard
					tone="warning"
					symbol="chart.bar"
					title={copy.title}
					body={copy.body}
					action={{
						label: "Reschedule habit →",
						onPress: () => onEditFrequency(insight.row.habit.id),
					}}
				/>
			);
		}
		case "improved": {
			const copy = improvedCopy(insight, summary);
			const { category } = insight.row.habit;
			// Informational: no action is invented for something that's working.
			return (
				<InsightCard
					symbol={categorySymbol(category)}
					accent={{
						tint: habitAccentTint(category.hue, scheme),
						ink: habitAccentInk(category.hue, scheme),
					}}
					title={copy.title}
					body={copy.body}
				/>
			);
		}
		case "pattern": {
			const copy = patternCopy(insight);
			const cause = insight.cause;
			return (
				<InsightCard
					symbol="calendar"
					title={copy.title}
					body={copy.body}
					action={
						cause && copy.actionLabel
							? {
									label: copy.actionLabel,
									onPress: () => onOpenReminders(cause.habit.id, cause.weekday),
								}
							: undefined
					}
				/>
			);
		}
		case "perfect":
			return (
				<InsightCard
					tone="success"
					symbol="checkmark"
					title="Perfect month"
					body="Every habit, every scheduled day. Nothing to fix."
				/>
			);
		default:
			return (
				<InsightCard
					symbol="clock"
					title="Nothing stands out"
					body="No habit slipped or climbed, and no day of the week fell behind."
				/>
			);
	}
}

function TooEarly({
	view,
}: {
	view: Extract<
		ReturnType<typeof useMonthlySummaryQueries>,
		{ state: "too-early" }
	>;
}) {
	const router = useRouter();
	const { colors } = useTheme();
	const copy = unlockCopy(view.unlock);
	const { summary, week } = view;

	return (
		<ScrollView
			style={[styles.screen, { backgroundColor: colors.bg }]}
			contentContainerStyle={styles.content}
		>
			<Header eyebrow={`Since ${format(view.firstDay, "d MMMM")}`} switcher />
			<UnlockCard
				title={copy.title}
				body={copy.body}
				progress={copy.progress}
				progressLabel={copy.progressLabel}
				remainingLabel={copy.remainingLabel}
			/>
			<Container>
				<SectionHeader
					title={`${format(summary.month.start, "MMMM")} so far`}
					size="small"
					count={`${pluralise(view.unlock.loggedDays, "day")} logged`}
				/>
				<CompletionGrid
					layout="month"
					accent={null}
					rows={calendarRows(summary.calendar)}
				/>
			</Container>
			<ListItem
				title="Your week is ready"
				subtitle={weeklyMenuSubline(week)}
				value="See week →"
				onPress={() => router.replace("/week")}
			/>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
		gap: 16,
	},
	emptyHeader: {
		paddingHorizontal: 16,
		paddingTop: 8,
	},
	header: {
		gap: 4,
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
		marginBottom: 8,
	},
	stats: {
		flexDirection: "row",
		gap: 8,
	},
	rows: {
		gap: 12,
	},
});
