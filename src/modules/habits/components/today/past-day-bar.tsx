import { Pressable, StyleSheet, Text, View } from "react-native";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { todayCopy } from "../../messages";

type PastDayBarProps = {
	dayLabel: string;
	onShowToday: () => void;
};

export function PastDayBar({ dayLabel, onShowToday }: PastDayBarProps) {
	const { colors, opacity } = useTheme();

	return (
		<View
			testID="past-day-bar"
			style={[styles.bar, { backgroundColor: colors.inner }]}
		>
			<Text style={[styles.text, { color: colors.ink }]}>
				{todayCopy.pastDayBar(dayLabel)}
			</Text>
			<Pressable
				accessibilityRole="button"
				onPress={onShowToday}
				style={({ pressed }) => [
					styles.link,
					pressed && { opacity: opacity.pressed },
				]}
			>
				<Text style={[styles.linkText, { color: colors.ink }]}>
					{todayCopy.showToday}
				</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderRadius: radius.l,
		paddingLeft: space[350],
		paddingRight: space[100],
		minHeight: minTouchTarget,
		gap: space[200],
	},
	text: {
		flex: 1,
		...textStyles.subhead,
	},
	link: {
		minHeight: minTouchTarget,
		justifyContent: "center",
		paddingHorizontal: space[300],
	},
	linkText: {
		...textStyles.subhead,
		fontWeight: "600",
		textDecorationLine: "underline",
	},
});
