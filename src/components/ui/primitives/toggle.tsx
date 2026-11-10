import { Pressable, StyleSheet, View } from "react-native";
import { minTouchTarget } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type ToggleProps = {
	value: boolean;
	onValueChange: (value: boolean) => void;
	accessibilityLabel: string;
	disabled?: boolean;
	/**
	 * Draw only: the row around it is the switch (`ToggleRow`), so this one takes
	 * no touches and is hidden from the screen reader.
	 */
	decorative?: boolean;
};

const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const KNOB = 27;
const INSET = 2;
const OUTLINE = 1.5;

/**
 * An accent track with an onAccent knob when on; off is the `track` fill with a 3:1 `outline` ring
 * (not colour alone), the knob on the left. 44 pt hit area around the 51 × 31 visual. Disabled
 * fades.
 */
export function Toggle({
	value,
	onValueChange,
	accessibilityLabel,
	disabled = false,
	decorative = false,
}: ToggleProps) {
	const { colors, opacity } = useTheme();
	const visual = (
		<View
			style={[
				styles.track,
				value
					? { backgroundColor: colors.accent, borderColor: colors.accent }
					: { backgroundColor: colors.track, borderColor: colors.outline },
				disabled && { opacity: opacity.disabled },
			]}
		>
			<View
				style={[
					styles.knob,
					value ? styles.knobOn : styles.knobOff,
					{ backgroundColor: value ? colors.onAccent : colors.card },
					!value && { borderColor: colors.outline },
				]}
			/>
		</View>
	);
	if (decorative) {
		return (
			<View
				pointerEvents="none"
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
			>
				{visual}
			</View>
		);
	}
	return (
		<Pressable
			accessibilityRole="switch"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ checked: value, disabled }}
			disabled={disabled}
			onPress={() => onValueChange(!value)}
			style={styles.touch}
		>
			{visual}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	touch: {
		minHeight: minTouchTarget,
		justifyContent: "center",
	},
	track: {
		width: TRACK_WIDTH,
		height: TRACK_HEIGHT,
		borderRadius: TRACK_HEIGHT / 2,
		borderWidth: OUTLINE,
		justifyContent: "center",
	},
	knob: {
		position: "absolute",
		width: KNOB,
		height: KNOB,
		borderRadius: KNOB / 2,
	},
	knobOn: {
		right: INSET - OUTLINE,
	},
	knobOff: {
		left: INSET - OUTLINE,
		borderWidth: StyleSheet.hairlineWidth,
	},
});
