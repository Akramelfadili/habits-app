import { StyleSheet, Text, View } from "react-native";
import { ChartCard } from "@/components/ui/composite/chart-card";
import { ProgressBar } from "@/components/ui/composite/progress-bar";
import { radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { progressCopy } from "../../messages";
import type { MonthRateRow } from "../../presenters/progress-calendar-presenter";

type MonthRatesCardProps = {
	rows: MonthRateRow[];
	/** "October so far". */
	meta: string;
};

/**
 * Per-habit rates (P8): ranked by rate, slipping last on the amber bar. A Break
 * habit carries an amber "Break" tag and counts resisted days; frozen days and
 * bonus logs are named in the line under the name. One VoiceOver stop per habit.
 */
export function MonthRatesCard({ rows, meta }: MonthRatesCardProps) {
	const { colors } = useTheme();

	return (
		<ChartCard
			testID="month-rates-card"
			title={progressCopy.month.perHabitTitle}
			meta={meta}
		>
			<View style={styles.rows}>
				{rows.map((row) => (
					<View
						key={row.key}
						testID={`month-rate-${row.key}`}
						accessible
						accessibilityLabel={row.accessibilityLabel}
						style={styles.row}
					>
						<View style={styles.line}>
							<View style={[styles.dot, { backgroundColor: row.dot }]} />
							<View style={styles.names}>
								<View style={styles.nameLine}>
									<Text
										style={[styles.name, { color: colors.ink }]}
										numberOfLines={2}
									>
										{row.name}
									</Text>
									{row.isBreak ? (
										<Text
											style={[
												styles.tag,
												{
													color: colors.warnInk,
													backgroundColor: colors.warnTint,
												},
											]}
										>
											{progressCopy.month.breakTag}
										</Text>
									) : null}
								</View>
								<Text style={[styles.sub, { color: colors.sub }]}>
									{row.sub}
								</Text>
							</View>
							<Text
								style={[
									styles.rate,
									{ color: row.slipping ? colors.warnInk : colors.ink },
								]}
							>
								{row.rate}
							</Text>
						</View>
						<ProgressBar
							value={row.bar}
							tone={row.slipping ? "warning" : "default"}
						/>
					</View>
				))}
			</View>
		</ChartCard>
	);
}

const styles = StyleSheet.create({
	rows: {
		gap: space[400],
	},
	row: {
		gap: space[150],
	},
	line: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: space[200],
	},
	dot: {
		width: space[200],
		height: space[200],
		borderRadius: space[100],
		marginTop: space[150],
	},
	names: {
		flex: 1,
		gap: space[50],
	},
	nameLine: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[150],
		flexWrap: "wrap",
	},
	name: {
		...textStyles.callout,
		flexShrink: 1,
	},
	tag: {
		...textStyles.caption,
		paddingHorizontal: space[150],
		borderRadius: radius.s,
		overflow: "hidden",
	},
	sub: {
		...textStyles.footnote,
	},
	rate: {
		...textStyles.callout,
		fontWeight: "500",
		fontVariant: ["tabular-nums"],
	},
});
