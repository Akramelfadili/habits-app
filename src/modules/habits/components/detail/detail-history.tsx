import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { detailCopy } from "../../messages";
import type { HistoryRowView } from "../../presenters/habit-detail-presenter";
import { HabitHistoryRow } from "../habit-history-row";

/**
 * Habit Detail's History (D2): the days that were done, missed, frozen or an
 * off-schedule bonus, newest first, in one flat card; or, for a habit with no
 * logs (D3), one line saying how to start. No times, and no "See all" yet (the
 * list is the last ten days that say something).
 */
export function DetailHistory({ rows }: { rows: readonly HistoryRowView[] }) {
	const { colors } = useTheme();

	return (
		<View style={styles.section}>
			<View accessible accessibilityRole="header" style={styles.header}>
				<SectionLabel>{detailCopy.history.header}</SectionLabel>
			</View>
			{rows.length > 0 ? (
				<Container variant="flat">
					{rows.map((row) => (
						<HabitHistoryRow
							key={row.key}
							date={row.date}
							status={row.status}
							tone={row.tone}
							tag={row.tag}
							note={row.note}
							accessibilityLabel={row.accessibilityLabel}
						/>
					))}
				</Container>
			) : (
				<Text style={[styles.empty, { color: colors.sub }]}>
					{detailCopy.history.empty}
				</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	section: {
		gap: space[150],
	},
	header: {
		paddingHorizontal: space[100],
	},
	empty: {
		...textStyles.footnote,
		paddingHorizontal: space[100],
	},
});
