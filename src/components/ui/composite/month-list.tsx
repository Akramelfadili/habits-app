import { Pressable, StyleSheet, Text, View } from "react-native";
import { minTouchTarget, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { ProgressBar } from "./progress-bar";

export type MonthListItemData = {
	key: string;
	/** "September". */
	label: string;
	/** Whole points; null when nothing was counted that month. */
	percent: number | null;
	/** 0–1 bar length. */
	bar: number;
	/** "September, 100 percent. Opens Month." */
	accessibilityLabel: string;
	onPress: () => void;
};

type MonthListProps = {
	items: MonthListItemData[];
	/** "No data" when a month has no rate. */
	emptyLabel: string;
};

/**
 * V3-06's list fallback for the year (P16): a month per row with a bar and a
 * whole-number %, one VoiceOver stop and one 44 pt target each. It is what
 * VoiceOver and the accessibility text sizes get instead of a wall of 16 pt
 * squares.
 */
export function MonthList({ items, emptyLabel }: MonthListProps) {
	const { colors } = useTheme();

	return (
		<View testID="month-list" style={styles.list}>
			{items.map((item) => (
				<Pressable
					key={item.key}
					testID={`month-list-${item.key}`}
					accessibilityRole="button"
					accessibilityLabel={item.accessibilityLabel}
					onPress={item.onPress}
					style={styles.row}
				>
					<View style={styles.line}>
						<Text style={[styles.label, { color: colors.ink }]}>
							{item.label}
						</Text>
						<Text style={[styles.percent, { color: colors.sub }]}>
							{item.percent === null ? emptyLabel : `${item.percent}%`}
						</Text>
					</View>
					<ProgressBar value={item.bar} />
				</Pressable>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	list: {
		gap: space[100],
	},
	row: {
		minHeight: minTouchTarget,
		justifyContent: "center",
		gap: space[100],
		paddingVertical: space[100],
	},
	line: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "baseline",
		gap: space[300],
	},
	label: {
		...textStyles.body,
		flexShrink: 1,
	},
	percent: {
		...textStyles.callout,
		fontVariant: ["tabular-nums"],
	},
});
