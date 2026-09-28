import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { StatCard } from "@/components/ui/composite/stat-card";
import { Caption } from "@/components/ui/primitives/caption";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { HabitEntryRow } from "../components/habit-entry-row";
import { HabitHeatmap } from "../components/habit-heatmap";
import { iconSymbolFor } from "../components/habit-today-row";
import { TodayStatePanel } from "../components/today-state-panel";
import { useHabitDetailQueries } from "../hooks/use-habit-detail-queries";
import {
	completionRateCaption,
	completionRateValue,
	habitSubtitle,
	longestStreakCaption,
} from "./habit-detail-helpers";

type HabitDetailScreenProps = {
	habitId: number;
};

/**
 * Habit Detail (HAB-09): header → streak / longest / 90-day tiles → 10-week
 * heatmap → recent entries, reverse chronological.
 */
export function HabitDetailScreen({ habitId }: HabitDetailScreenProps) {
	const { colors, scheme } = useTheme();
	const detail = useHabitDetailQueries(habitId);
	// Heatmap taps land here — the navigation hook into retro logging. HAB-10
	// reads the selected day back out to open its sheet for that date.
	const [, setRetroLogDate] = useState<Date | null>(null);

	if (!detail) {
		return (
			<View style={[styles.screen, { backgroundColor: colors.bg }]}>
				<TodayStatePanel
					icon="questionmark"
					headline="Habit not found"
					subtitle="It may have been deleted."
				/>
			</View>
		);
	}

	const {
		habit,
		currentStreak,
		longestStreak,
		completionRate,
		heatmapWeeks,
		recentEntries,
		hasEntries,
		today,
	} = detail;

	return (
		<ScrollView
			style={[styles.screen, { backgroundColor: colors.bg }]}
			contentContainerStyle={styles.content}
		>
			<View style={styles.header}>
				<IconBadge
					size="large"
					symbol={iconSymbolFor(habit.icon)}
					accent={{
						tint: habitAccentTint(habit.color, scheme),
						ink: habitAccentInk(habit.color, scheme),
					}}
				/>
				<View style={styles.headerText}>
					<Text style={[styles.name, { color: colors.ink }]}>{habit.name}</Text>
					<Text style={[styles.subtitle, { color: colors.sub }]}>
						{habitSubtitle(habit, today)}
					</Text>
				</View>
			</View>

			<View style={styles.stats}>
				<StatCard
					label="Current"
					value={String(currentStreak)}
					caption="day streak"
					muted={currentStreak === 0}
				/>
				<StatCard
					label="Longest"
					value={String(longestStreak.days)}
					caption={longestStreakCaption(longestStreak)}
					muted={longestStreak.days === 0}
				/>
				<StatCard
					label="90 days"
					value={completionRateValue(completionRate)}
					caption={completionRateCaption(completionRate)}
					muted={completionRate.fraction === null}
				/>
			</View>

			<HabitHeatmap
				habit={habit}
				weeks={heatmapWeeks}
				today={today}
				hasEntries={hasEntries}
				onSelectDay={setRetroLogDate}
			/>

			<View style={styles.entries}>
				<Caption>Recent entries</Caption>
				{recentEntries.length > 0 ? (
					<Container dividers compact>
						{recentEntries.map((entry) => (
							<HabitEntryRow
								key={entry.id}
								habit={habit}
								entry={entry}
								today={today}
							/>
						))}
					</Container>
				) : (
					<Container>
						<TodayStatePanel
							centered={false}
							icon="circle.dashed"
							headline="No entries yet"
							subtitle="Check it off on Today, or tap a past day above to log it."
						/>
					</Container>
				)}
			</View>
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
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
	},
	headerText: {
		flex: 1,
		gap: 2,
	},
	name: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
	subtitle: {
		fontSize: typeScale.subtitle,
	},
	stats: {
		flexDirection: "row",
		gap: 8,
	},
	entries: {
		gap: 8,
	},
});
