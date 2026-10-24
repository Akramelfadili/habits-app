import { format } from "date-fns";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
	type ChartColumnState,
	ColumnBars,
} from "@/components/ui/composite/column-bars";
import { CompletionGrid } from "@/components/ui/composite/completion-grid";
import { Container } from "@/components/ui/composite/container";
import { InsightCard } from "@/components/ui/composite/insight-card";
import { ListItem } from "@/components/ui/composite/list-item";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { StatCard } from "@/components/ui/composite/stat-card";
import { TrendRow } from "@/components/ui/composite/trend-row";
import { UnlockCard } from "@/components/ui/composite/unlock-card";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { categorySymbol } from "../components/category-symbol";
import { HabitBadge } from "../components/habit-badge";
import { RangeSwitcher } from "../components/range-switcher";
import { TodayStatePanel } from "../components/today-state-panel";
import {
	useYearlySummaryQueries,
	type YearlySummaryView,
} from "../hooks/use-yearly-summary-queries";
import { weeklyMenuSubline } from "../presenters/weekly-summary-helpers";
import {
	bestMonthCopy,
	bestMonthLabel,
	chartLabel,
	earlyCopy,
	insightCountLabel,
	MONTH_INITIALS,
	monthCellLabel,
	neverStuckCopy,
	seasonalCopy,
	stripCellState,
	stripRowLabel,
	stuckCopy,
	unlockCopy,
	yearlyTiles,
	yearRangeLabel,
	yearTitle,
} from "../presenters/yearly-summary-helpers";
import type { YearlyInsight } from "../services/yearly-insights";
import type { YearlySummary, YearMonthCell } from "../services/yearly-summary";

/**
 * Yearly Summary (HAB-17, frames C4/C5/C7): range switcher → Logged / Overall
 * / Longest tiles → completion-by-month chart → per-habit month strips →
 * ranked insights (max three; only "never stuck" can be tapped). All twelve
 * month slots always render. Under three months of history it shows the
 * unlock card and the partial chart instead — never a locked wall.
 */
export function YearlySummaryScreen() {
	const { colors } = useTheme();
	const view = useYearlySummaryQueries();

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
					<Header title="Your year" />
				</View>
				<TodayStatePanel
					icon="chart.bar"
					headline="Nothing to summarise yet"
					subtitle="Add a habit and its year will show up here."
				/>
			</View>
		);
	}

	if (view.state === "too-early") return <TooEarly view={view} />;
	return <Ready view={view} />;
}

function Header({
	eyebrow,
	title,
	switcher = false,
}: {
	eyebrow?: string;
	title: string;
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
				{title}
			</Text>
			{switcher ? <RangeSwitcher value="year" /> : null}
		</View>
	);
}

function chartColumn(cell: YearMonthCell): {
	value: number | null;
	state: ChartColumnState;
} {
	if (cell.kind !== "counted") return { value: null, state: "empty" };
	return {
		value: cell.rate,
		state: cell.current ? "current" : "complete",
	};
}

/** NEW-09: the month-by-month chart, all twelve slots, inside a chart card. */
function CompletionChart({
	summary,
	note,
}: {
	summary: YearlySummary;
	note: string | null;
}) {
	const columns = summary.months.map(chartColumn);
	return (
		<Container>
			<SectionHeader
				title="Completion by month"
				size="small"
				count={note ?? undefined}
			/>
			<ColumnBars
				context="chart"
				values={columns.map(({ value }) => value)}
				states={columns.map(({ state }) => state)}
				labels={MONTH_INITIALS}
				accessibilityLabel={chartLabel(summary)}
			/>
		</Container>
	);
}

function Ready({
	view,
}: {
	view: Extract<YearlySummaryView, { state: "ready" }>;
}) {
	const router = useRouter();
	const { colors } = useTheme();
	const { summary, firstDay } = view;
	const tiles = yearlyTiles(summary);

	return (
		<ScrollView
			style={[styles.screen, { backgroundColor: colors.bg }]}
			contentContainerStyle={styles.content}
		>
			<Header
				eyebrow={yearRangeLabel(summary, firstDay, new Date())}
				title={yearTitle(summary)}
				switcher
			/>

			<View style={styles.stats}>
				<StatCard
					label="Logged"
					value={tiles.logged.value}
					caption={tiles.logged.caption}
					muted={summary.logged === 0}
				/>
				<StatCard
					label="Overall"
					value={tiles.overall.value}
					caption={tiles.overall.caption}
					muted={summary.rate === null}
				/>
				<StatCard
					label="Longest"
					value={tiles.longest.value}
					caption={tiles.longest.caption}
					muted={summary.longest.days === 0}
				/>
			</View>

			<CompletionChart summary={summary} note={bestMonthLabel(summary)} />

			<Container>
				<SectionHeader
					title="Per habit · by month"
					size="small"
					count="J — D"
				/>
				<View style={styles.rows}>
					{summary.rows.map((row) => (
						<TrendRow
							key={row.habit.id}
							label={row.habit.name}
							badge={<HabitBadge habit={row.habit} />}
							trend={
								<CompletionGrid
									layout="year"
									accent={row.habit.category.hue}
									rows={[
										row.cells.map((cell) => ({
											key: cell.month.toISOString(),
											state: stripCellState(cell),
											accessibilityLabel: monthCellLabel(cell),
										})),
									]}
								/>
							}
							accessibilityLabel={stripRowLabel(row)}
						/>
					))}
				</View>
			</Container>

			{summary.insights.length > 0 ? (
				<SectionHeader
					title={`What ${format(summary.year.start, "yyyy")} says`}
					size="small"
					count={insightCountLabel(summary.insights.length)}
				/>
			) : null}
			{summary.insights.map((insight) => (
				<Insight
					key={insight.type}
					insight={insight}
					summary={summary}
					onEditHabit={(id) => router.push(`/edit-habit/${id}`)}
				/>
			))}
		</ScrollView>
	);
}

function Insight({
	insight,
	summary,
	onEditHabit,
}: {
	insight: YearlyInsight;
	summary: YearlySummary;
	onEditHabit: (habitId: number) => void;
}) {
	const { scheme } = useTheme();
	switch (insight.type) {
		case "best-month": {
			const copy = bestMonthCopy(insight);
			// Read-only: a best month has nothing to fix, so no tap target is invented.
			const habit = insight.streak?.habit;
			return (
				<InsightCard
					symbol={habit ? categorySymbol(habit.category) : "chart.bar"}
					accent={
						habit
							? {
									tint: habitAccentTint(habit.category.hue, scheme),
									ink: habitAccentInk(habit.category.hue, scheme),
								}
							: undefined
					}
					title={copy.title}
					body={copy.body}
				/>
			);
		}
		case "stuck": {
			const copy = stuckCopy(insight);
			const { category } = insight.row.habit;
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
		case "never-stuck": {
			const copy = neverStuckCopy(insight);
			// The year's only tappable card: Edit habit (where Archive should sit at the foot — see docs/backlog.md).
			return (
				<InsightCard
					tone="warning"
					symbol={categorySymbol(insight.row.habit.category)}
					title={copy.title}
					body={copy.body}
					action={{
						label: copy.actionLabel,
						onPress: () => onEditHabit(insight.row.habit.id),
					}}
				/>
			);
		}
		case "seasonal": {
			const copy = seasonalCopy(insight);
			return (
				<InsightCard symbol="calendar" title={copy.title} body={copy.body} />
			);
		}
		case "perfect":
			return (
				<InsightCard
					tone="success"
					symbol="checkmark"
					title="Perfect year so far"
					body="Every habit, every scheduled day. Nothing to fix."
				/>
			);
		case "early": {
			const copy = earlyCopy(summary, new Date());
			return <InsightCard symbol="clock" title={copy.title} body={copy.body} />;
		}
		default:
			return (
				<InsightCard
					symbol="clock"
					title="Nothing stands out"
					body="No habit stuck or stalled, and no season fell behind."
				/>
			);
	}
}

function TooEarly({
	view,
}: {
	view: Extract<YearlySummaryView, { state: "too-early" }>;
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
			<Header
				eyebrow={`Since ${format(view.firstDay, "d MMMM")}`}
				title="Your year"
				switcher
			/>
			<UnlockCard
				title={copy.title}
				body={copy.body}
				progress={copy.progress}
				progressLabel={copy.progressLabel}
				remainingLabel={copy.remainingLabel}
			/>
			<CompletionChart
				summary={summary}
				note={`Since ${format(view.firstDay, "d MMMM")}`}
			/>
			<ListItem
				title="Your week is ready"
				subtitle={weeklyMenuSubline(week)}
				value="See week →"
				onPress={() => router.replace("/habits/week")}
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
		paddingBottom: 24,
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
