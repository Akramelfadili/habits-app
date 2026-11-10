import { Pressable, StyleSheet, Text, View } from "react-native";
import { minTouchTarget, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { ProgressBar } from "./progress-bar";

export type MonthListItemData = {
	key: string;
	label: string;
	percent: number | null;
	bar: number;
	accessibilityLabel: string;
	onPress: () => void;
};

type MonthListProps = {
	items: MonthListItemData[];
	emptyLabel: string;
};

export function MonthList({ items, emptyLabel }: MonthListProps) {
	const { colors, opacity } = useTheme();

	return (
		<View testID="month-list" style={styles.list}>
			{items.map((item) => (
				<Pressable
					key={item.key}
					testID={`month-list-${item.key}`}
					accessibilityRole="button"
					accessibilityLabel={item.accessibilityLabel}
					onPress={item.onPress}
					style={({ pressed }) => [
						styles.row,
						pressed && { opacity: opacity.pressed },
					]}
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
