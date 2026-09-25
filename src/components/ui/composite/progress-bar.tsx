import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/use-theme";

type ProgressBarProps = {
	/** 0–1. Values outside that range are clamped. */
	value: number;
	/** "warning" is the flagged/slipping treatment (design-system.md's Progress bar entry). */
	tone?: "default" | "warning";
};

/** Overall completion bar (Today) and per-habit bars (Weekly Summary). */
export function ProgressBar({ value, tone = "default" }: ProgressBarProps) {
	const { colors } = useTheme();
	const fraction = Math.min(1, Math.max(0, value));

	return (
		<View
			testID="progress-bar"
			style={[styles.track, { backgroundColor: colors.track }]}
			accessibilityRole="progressbar"
			accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
		>
			<View
				style={[
					styles.fill,
					{
						width: `${fraction * 100}%`,
						backgroundColor: tone === "warning" ? colors.warnInk : colors.ink,
					},
				]}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	track: {
		height: 6,
		borderRadius: 3,
		overflow: "hidden",
	},
	fill: {
		height: "100%",
		borderRadius: 3,
	},
});
