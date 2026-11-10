import { StyleSheet, Text, View } from "react-native";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";

type HabitHistoryRowProps = {
	date: string;
	/** "Done", "Missed", "Frozen · streak kept", "Done · off-schedule, not counted"; never a time. */
	status: string;
	/** A frozen day reads in the freeze's violet; everything else is secondary ink. */
	tone?: "default" | "frozen";
	/** "Bonus": the small tag on an off-schedule day, which a rate never counts. */
	tag?: string;
	/** The day's own note, under the status. */
	note?: string;
	accessibilityLabel: string;
};

/**
 * One line of Habit Detail's history: the date over what the day was, and a Bonus tag when it was
 * off-schedule. A read-only row: no times, no chevron. The words carry the state, so the violet on a
 * frozen day is never the only signal. The row is one VoiceOver stop; at accessibility sizes the tag
 * drops under the text.
 */
export function HabitHistoryRow({
	date,
	status,
	tone = "default",
	tag,
	note,
	accessibilityLabel,
}: HabitHistoryRowProps) {
	const { colors } = useTheme();
	const largeText = useAccessibilityTextSize();

	return (
		<View
			testID="habit-history-row"
			accessible
			accessibilityLabel={accessibilityLabel}
			style={[styles.row, largeText && styles.rowStacked]}
		>
			<View style={styles.text}>
				<Text style={[styles.date, { color: colors.ink }]}>{date}</Text>
				<Text
					style={[
						styles.status,
						{ color: tone === "frozen" ? colors.frozenInk : colors.sub },
					]}
				>
					{status}
				</Text>
				{note ? (
					<Text style={[styles.status, { color: colors.sub }]}>{note}</Text>
				) : null}
			</View>
			{tag ? (
				<View
					testID="habit-history-tag"
					style={[styles.tag, { backgroundColor: colors.inner }]}
				>
					<Text style={[styles.tagLabel, { color: colors.sub }]}>{tag}</Text>
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		minHeight: minTouchTarget + 2 * space[200],
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: space[300],
		paddingVertical: space[250],
		paddingHorizontal: space[350],
	},
	rowStacked: {
		flexDirection: "column",
		alignItems: "flex-start",
		padding: space[400],
	},
	text: {
		flexShrink: 1,
		gap: space[50],
	},
	date: {
		...textStyles.body,
	},
	status: {
		...textStyles.footnote,
	},
	tag: {
		borderRadius: radius.s,
		paddingVertical: space[50],
		paddingHorizontal: space[200],
	},
	tagLabel: {
		...textStyles.caption,
	},
});
