import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { InsightCard } from "@/components/ui/composite/insight-card";
import { ProgressRow } from "@/components/ui/composite/progress-row";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { StatCard } from "@/components/ui/composite/stat-card";
import { Caption } from "@/components/ui/primitives/caption";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { SegmentedControl } from "@/components/ui/primitives/segmented-control";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { HabitBadge } from "../components/habit-badge";
import { RangeSwitcher } from "../components/range-switcher";
import { TodayStatePanel } from "../components/today-state-panel";
import { useWeeklySummaryQueries } from "../hooks/use-weekly-summary-queries";
import {
	defaultSummaryWeek,
	type SummaryWeek,
	type WeeklyInsight,
} from "../services/weekly-summary";
import {
	bestDayTile,
	slippingBody,
	weeklyRowCount,
	weeklyRowLabel,
	weekRangeLabel,
} from "./weekly-summary-helpers";

/**
 * Weekly Summary (HAB-11): week range header with a Last week / This week
 * switch and, under the title, the Week / Month / Year range switcher
 * (HAB-16) → Completed / Best day tiles → per-habit bars, worst first → one
 * insight card (slipping habit, perfect week, or too early to call — the slot
 * is never empty). Opens on last week early in the week, when this one has
 * too little in it to say anything (`defaultSummaryWeek`).
 */
export function WeeklySummaryScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const [which, setWhich] = useState<SummaryWeek>(() =>
		defaultSummaryWeek(new Date()),
	);
	const summary = useWeeklySummaryQueries(which);
	const { week, completed, scheduled, rows, bestDay, isPerfect, insight } =
		summary;

	const header = (
		<View style={styles.header}>
			<SectionLabel>{weekRangeLabel(week)}</SectionLabel>
			<View style={styles.titleRow}>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					Your week
				</Text>
				{summary.hasHabits ? (
					<SegmentedControl
						size="compact"
						label="Week shown"
						options={[
							{ value: "last", label: "Last week" },
							{ value: "this", label: "This week" },
						]}
						value={which}
						onChange={setWhich}
					/>
				) : null}
			</View>
			{summary.hasHabits ? (
				<View style={styles.switcher}>
					<RangeSwitcher value="week" />
				</View>
			) : null}
		</View>
	);

	// Habits still loading: a neutral blank, never "Nothing to summarise yet".
	if (!summary.isLoaded) {
		return (
			<View
				testID="screen-loading"
				style={[styles.screen, { backgroundColor: colors.bg }]}
			/>
		);
	}

	if (!summary.hasHabits) {
		return (
			<View style={[styles.screen, { backgroundColor: colors.bg }]}>
				<View style={styles.headerPadding}>{header}</View>
				<TodayStatePanel
					icon="chart.bar"
					headline="Nothing to summarise yet"
					subtitle="Add a habit and its week will show up here."
				/>
			</View>
		);
	}

	const flaggedHabitId =
		insight.type === "slipping" ? insight.row.habit.id : null;
	const best = bestDayTile(bestDay, isPerfect);

	return (
		<ScrollView
			style={[styles.screen, { backgroundColor: colors.bg }]}
			contentContainerStyle={styles.content}
		>
			{header}

			<View style={styles.stats}>
				<StatCard
					label="Completed"
					value={String(completed)}
					caption={`of ${scheduled} scheduled`}
					muted={scheduled === 0}
				/>
				<StatCard
					label="Best day"
					value={best.value}
					caption={best.caption}
					muted={!bestDay}
				/>
			</View>

			<Container>
				<SectionHeader title="Per habit" size="small" />
				{rows.length > 0 ? (
					<View style={styles.rows}>
						{rows.map((row) => (
							<ProgressRow
								key={row.habit.id}
								badge={<HabitBadge habit={row.habit} />}
								label={weeklyRowLabel(row.habit)}
								count={weeklyRowCount(row)}
								value={row.fraction}
								tone={row.habit.id === flaggedHabitId ? "warning" : "default"}
							/>
						))}
					</View>
				) : (
					<Caption>{`Nothing has been due yet ${weekPhrase(which)}.`}</Caption>
				)}
			</Container>

			<Insight
				insight={insight}
				which={which}
				onReschedule={(habitId) =>
					router.push(`/edit-habit/${habitId}?focus=frequency`)
				}
			/>
		</ScrollView>
	);
}

/** "this week" / "last week" — for copy that names the week being shown. */
function weekPhrase(which: SummaryWeek): string {
	return which === "last" ? "last week" : "this week";
}

function Insight({
	insight,
	which,
	onReschedule,
}: {
	insight: WeeklyInsight;
	which: SummaryWeek;
	onReschedule: (habitId: number) => void;
}) {
	switch (insight.type) {
		case "slipping":
			return (
				<InsightCard
					tone="warning"
					symbol="diamond.fill"
					title={`${insight.row.habit.name} is slipping`}
					body={slippingBody(insight.row)}
					action={{
						label: "Reschedule habit →",
						onPress: () => onReschedule(insight.row.habit.id),
					}}
				/>
			);
		case "perfect":
			return (
				<InsightCard
					tone="success"
					symbol="checkmark"
					title="Perfect week"
					body={`Every habit, every scheduled day. Nothing to fix ${weekPhrase(which)}.`}
				/>
			);
		default:
			return (
				<InsightCard
					symbol="clock"
					title="Too early to call"
					body={`No habit has been due three times yet ${weekPhrase(which)}.`}
				/>
			);
	}
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
	headerPadding: {
		paddingHorizontal: 16,
		paddingTop: 8,
	},
	header: {
		gap: 4,
	},
	switcher: {
		marginTop: 8,
	},
	rows: {
		gap: 12,
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
	stats: {
		flexDirection: "row",
		gap: 8,
	},
});
