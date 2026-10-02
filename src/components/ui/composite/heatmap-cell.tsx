import { Pressable, StyleSheet, View } from "react-native";
import {
	type AccentHue,
	type HeatmapLevel,
	habitAccentInk,
	heatmapLevelColor,
	inkLevelColor,
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
	/** Logged on a day that wasn't scheduled — a "bonus dot" (NEW-16, HAB-18); never counts toward anything. */
	| { kind: "bonus" }
	/** Not part of the history yet or no more — before a habit's start, or still ahead (month calendar, HAB-16). */
	| { kind: "outside" }
	| { kind: "level"; level: HeatmapLevel };

type HeatmapCellProps = {
	state: HeatmapCellState;
	/** The habit's accent hue; null is the neutral accent (category "Other"). */
	accent: AccentHue;
	/** Fixed edge length (legend swatches, Detail's grid); omitted, the cell fills its grid slot. */
	size?: number;
	/**
	 * A cell that fills its slot's width at a fixed height — the month
	 * calendar's pills (HAB-16). Ignored when `size` is set.
	 */
	height?: number;
	/**
	 * "ink" shades levels grey → near-ink instead of in the accent's hue — for
	 * a grid across all habits (Monthly's calendar), where no one accent applies.
	 */
	ramp?: "accent" | "ink";
	onPress?: () => void;
	accessibilityLabel?: string;
};

export function HeatmapCell({
	state,
	accent,
	size,
	height,
	ramp = "accent",
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
		bonus: {
			backgroundColor: colors.card,
			borderColor: colors.border,
			borderStyle: "solid" as const,
		},
		outside: {
			backgroundColor: "transparent",
			borderColor: colors.border,
			borderStyle: "dashed" as const,
		},
		frozen: {
			backgroundColor: colors.frozenBg,
			borderColor: colors.frozenInk,
			borderStyle: "dashed" as const,
		},
		level: {
			backgroundColor:
				state.kind === "level"
					? ramp === "ink"
						? inkLevelColor(state.level, scheme)
						: heatmapLevelColor(accent, state.level, scheme)
					: colors.track,
			borderColor: "transparent",
			borderStyle: "solid" as const,
		},
	}[state.kind];

	// NEW-16: the radius is a third of the edge at every size.
	const sized = size
		? { width: size, height: size, borderRadius: Math.floor(size / 3) }
		: height
			? { flex: 1, height, borderRadius: Math.floor(height / 3) }
			: styles.fill;
	const shape = [sized, styles.base, fill];
	// The bonus dot: a quarter of the edge (min 3px), in the accent's ink.
	const dotSize = Math.max(3, Math.round((size ?? height ?? 18) / 4));
	const dot =
		state.kind === "bonus" ? (
			<View
				testID="heatmap-cell-bonus-dot"
				style={{
					width: dotSize,
					height: dotSize,
					borderRadius: dotSize / 2,
					backgroundColor: habitAccentInk(accent, scheme),
				}}
			/>
		) : null;

	if (!onPress) {
		return (
			<View
				testID={`heatmap-cell-${state.kind}`}
				accessibilityLabel={accessibilityLabel}
				style={shape}
			>
				{dot}
			</View>
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
		>
			{dot}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	base: {
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	fill: {
		flex: 1,
		aspectRatio: 1,
		borderRadius: 6,
	},
});
