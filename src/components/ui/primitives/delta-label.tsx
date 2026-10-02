import { StyleSheet, Text } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type DeltaLabelProps = {
	/** Percentage points against the comparison period. */
	points: number;
};

/** Signed change ("+4", "−3", "0") — up and flat read quietly, down in the warning ink (NEW-20). */
export function DeltaLabel({ points }: DeltaLabelProps) {
	const { colors } = useTheme();
	const text = points > 0 ? `+${points}` : points < 0 ? `−${-points}` : "0";
	const spoken =
		points > 0
			? `up ${points} points`
			: points < 0
				? `down ${-points} points`
				: "no change";

	return (
		<Text
			accessibilityLabel={spoken}
			style={[
				styles.label,
				{ color: points < 0 ? colors.warnInk : colors.sub },
			]}
		>
			{text}
		</Text>
	);
}

const styles = StyleSheet.create({
	label: {
		fontSize: typeScale.subtitle,
		fontVariant: ["tabular-nums"],
		minWidth: 24,
		textAlign: "right",
	},
});
