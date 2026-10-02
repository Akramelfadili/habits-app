import { Pressable, StyleSheet, View } from "react-native";
import {
	type AccentHue,
	type HeatmapLevel,
	heatmapLevelColor,
} from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

/**
 * Every documented heatmap cell state (design-system "Heatmap cell"). A
 * `level` is a logged day, shaded by how much of it was done — a frozen day
 * has its own treatment so it never reads as a real completion (HAB-08).
 */
export type HeatmapCellState =
	| { kind: "not-scheduled" }
	| { kind: "missed" }
	| { kind: "frozen" }
	| { kind: "level"; level: HeatmapLevel };

type HeatmapCellProps = {
	state: HeatmapCellState;
	/** The habit's accent hue; null is the neutral accent (category "Other"). */
	accent: AccentHue;
	/** Fixed edge length (legend swatches); omitted, the cell fills its grid slot. */
	size?: number;
	onPress?: () => void;
	accessibilityLabel?: string;
};

export function HeatmapCell({
	state,
	accent,
	size,
	onPress,
	accessibilityLabel,
}: HeatmapCellProps) {
	const { colors, scheme, opacity } = useTheme();

	const fill = {
		"not-scheduled": {
			backgroundColor: colors.card,
			borderColor: colors.border,
			borderStyle: "solid" as const,
		},
		missed: {
			backgroundColor: colors.track,
			borderColor: colors.track,
			borderStyle: "solid" as const,
		},
		frozen: {
			backgroundColor: colors.frozenBg,
			borderColor: colors.frozenInk,
			borderStyle: "dashed" as const,
		},
		level: {
			backgroundColor:
				state.kind === "level"
					? heatmapLevelColor(accent, state.level, scheme)
					: colors.track,
			borderColor: "transparent",
			borderStyle: "solid" as const,
		},
	}[state.kind];

	const shape = [
		size ? { width: size, height: size, borderRadius: size / 4 } : styles.fill,
		styles.base,
		fill,
	];

	if (!onPress) {
		return (
			<View
				testID={`heatmap-cell-${state.kind}`}
				accessibilityLabel={accessibilityLabel}
				style={shape}
			/>
		);
	}

	return (
		<Pressable
			testID={`heatmap-cell-${state.kind}`}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			onPress={onPress}
			style={({ pressed }) => [
				...shape,
				pressed && { opacity: opacity.pressed },
			]}
		/>
	);
}

const styles = StyleSheet.create({
	base: {
		borderWidth: 1,
	},
	fill: {
		flex: 1,
		aspectRatio: 1,
		borderRadius: 6,
	},
});
