import { StyleSheet, Text, View } from "react-native";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";

type HabitHistoryRowProps = {
	date: string;
	status: string;
	tone?: "default" | "frozen";
	tag?: string;
	note?: string;
	accessibilityLabel: string;
};

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
