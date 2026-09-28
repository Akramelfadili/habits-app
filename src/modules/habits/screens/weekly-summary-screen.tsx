import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { InsightCard } from "@/components/ui/composite/insight-card";
import { ProgressRow } from "@/components/ui/composite/progress-row";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { StatCard } from "@/components/ui/composite/stat-card";
import { Caption } from "@/components/ui/primitives/caption";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { TodayStatePanel } from "../components/today-state-panel";
import { useWeeklySummaryQueries } from "../hooks/use-weekly-summary-queries";
import type { WeeklyInsight } from "../services/weekly-summary";
import {
	bestDayTile,
	slippingBody,
	weeklyRowCount,
	weeklyRowLabel,
	weekRangeLabel,
} from "./weekly-summary-helpers";

/**
 * Weekly Summary (HAB-11): week range header → Completed / Best day tiles →
 * per-habit bars, worst first → one insight card (slipping habit, perfect
 * week, or too early to call — the slot is never empty).
 */
export function WeeklySummaryScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const summary = useWeeklySummaryQueries();
	const { week, completed, scheduled, rows, bestDay, isPerfect, insight } =
		summary;

	const header = (
		<View style={styles.header}>
			<SectionLabel>{weekRangeLabel(week)}</SectionLabel>
			<Text style={[styles.title, { color: colors.ink }]}>Your week</Text>
		</View>
	);

	if (!summary.hasHabits) {
		return (
			<View style={[styles.screen, { backgroundColor: colors.bg }]}>
				<View style={styles.headerPadding}>{header}</View>
				<TodayStatePanel
					icon="chart.bar"
					headline="Nothing to summarize yet"
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
					rows.map((row) => (
						<ProgressRow
							key={row.habit.id}
							label={weeklyRowLabel(row.habit)}
							count={weeklyRowCount(row)}
							value={row.fraction}
							tone={row.habit.id === flaggedHabitId ? "warning" : "default"}
						/>
					))
				) : (
					<Caption>Nothing has been due yet this week.</Caption>
				)}
			</Container>

			<Insight
				insight={insight}
				onReschedule={(habitId) => router.push(`/edit-habit/${habitId}`)}
			/>
		</ScrollView>
	);
}

function Insight({
	insight,
	onReschedule,
}: {
	insight: WeeklyInsight;
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
					body="Every habit, every scheduled day. Nothing to fix this week."
				/>
			);
		default:
			return (
				<InsightCard
					symbol="clock"
					title="Too early to call"
					body="No habit has been due three times yet this week."
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
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
	stats: {
		flexDirection: "row",
		gap: 8,
	},
});
