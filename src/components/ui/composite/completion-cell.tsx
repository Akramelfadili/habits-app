import { Pressable, StyleSheet, Text, View } from "react-native";
import {
	cellRadius,
	type IntensityLevel,
	intensityColor,
	minTouchTarget,
	notchShare,
	readableInk,
	textStyles,
	todayRingShadow,
} from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

/**
 * Every state a completion cell can be in (V3-05, F-02). Each differs from the
 * others by shape or text as well as colour (08.7): a notch for partial, a dot
 * for bonus, dashed for frozen and before-start, an outline for nothing logged,
 * a hairline for the future, no box at all for not due.
 */
export type CompletionCellState =
	/** 0 missed (the filled track) · 1–2 partial (a corner notch) · 3 complete. */
	| { kind: "level"; level: IntensityLevel }
	/** A freeze covers the day: violet, always dashed. */
	| { kind: "frozen" }
	/** Logged on a day that wasn't due: a dot on the track, never counted (D11). */
	| { kind: "bonus" }
	/** Not due that day: no box, only a quiet dot (or the bare day number). */
	| { kind: "not-due" }
	/** Before the habit existed or the first log: dashed outline. */
	| { kind: "before-start" }
	/** Due, but nothing has been logged yet: an outline — deliberately not "missed". */
	| { kind: "nothing-logged" }
	/** Still ahead: a hairline. */
	| { kind: "future" }
	/** Inside an archive period: dotted and empty — skipped, never missed (HAB-20). */
	| { kind: "paused" }
	/** The missed day that reset a streak with no freezes left: the track with an amber outline (D6). */
	| { kind: "reset" };

type CompletionCellProps = {
	state: CompletionCellState;
	/** Edge length: 12 legend, 16 year, 24 matrix, 40 calendar. */
	size: number;
	/** The cell is today: ringed whatever its state. */
	today?: boolean;
	/** The cell is the selected day (Month, P13): ringed like today. */
	selected?: boolean;
	/** A number or letter drawn inside (the calendar's day number). */
	text?: string;
	/** Read aloud ("Wed, done"); without one the cell is not a VoiceOver stop. */
	accessibilityLabel?: string;
	/** Hide the cell from VoiceOver entirely (the year map's day cells, 08.3). */
	hidden?: boolean;
	/** The colour of the surface under the cell, for the notch and the ring's gap. Defaults to the card. */
	surface?: string;
	onPress?: () => void;
	testID?: string;
};

/** The notch's legs, in pt: 22 % of the edge, never below 3 so it survives at 12 pt. */
export function notchSize(size: number): number {
	return Math.max(3, Math.round(size * notchShare));
}

/**
 * V3-05: one read-only square, radius floor(size ÷ 3), filled by accent tints
 * at 0 / 28 / 58 / 100 %. Only a cell given `onPress` is a button (the month
 * calendar's 40 pt days); every other cell is below 44 pt by design and not
 * tappable.
 */
export function CompletionCell({
	state,
	size,
	today = false,
	selected = false,
	text,
	accessibilityLabel,
	hidden = false,
	surface,
	onPress,
	testID,
}: CompletionCellProps) {
	const { colors, scheme, opacity } = useTheme();
	const base = surface ?? colors.card;
	const level = state.kind === "level" ? state.level : null;

	const fill = {
		level: level === null ? undefined : intensityColor(level, scheme),
		frozen: colors.frozenBg,
		bonus: colors.track,
		reset: colors.track,
	};
	const backgroundColor =
		state.kind === "level"
			? fill.level
			: state.kind === "frozen" || state.kind === "bonus"
				? fill[state.kind]
				: state.kind === "reset"
					? fill.reset
					: "transparent";
	const border = {
		frozen: { color: colors.frozenInk, style: "dashed" },
		"before-start": { color: colors.outline, style: "dashed" },
		"nothing-logged": { color: colors.outline, style: "solid" },
		future: { color: colors.border, style: "solid" },
		paused: { color: colors.outline, style: "dotted" },
		reset: { color: colors.warnInk, style: "solid" },
	} as const;
	const edge =
		state.kind in border ? border[state.kind as keyof typeof border] : null;

	const dotSize = Math.max(3, Math.round(size / 4));
	const showQuietDot = state.kind === "not-due" && text === undefined;
	const inkOnFill =
		state.kind === "level" && backgroundColor
			? readableInk(backgroundColor, scheme)
			: state.kind === "frozen"
				? colors.ink
				: state.kind === "not-due" || state.kind === "future"
					? colors.faint
					: colors.sub;

	const ring = today || selected;
	const shape = [
		styles.base,
		{
			width: size,
			height: size,
			borderRadius: cellRadius(size),
			backgroundColor,
			borderColor: edge?.color ?? "transparent",
			borderStyle: edge?.style ?? "solid",
		},
		ring && { boxShadow: todayRingShadow(base, scheme) },
	];

	const content = (
		<>
			{level === 1 || level === 2 ? (
				<View
					testID="completion-cell-notch"
					pointerEvents="none"
					style={[
						styles.notch,
						{
							borderTopWidth: notchSize(size),
							borderLeftWidth: notchSize(size),
							borderTopColor: base,
						},
					]}
				/>
			) : null}
			{state.kind === "bonus" ? (
				<View
					testID="completion-cell-bonus-dot"
					style={{
						width: dotSize,
						height: dotSize,
						borderRadius: dotSize / 2,
						backgroundColor: colors.accent,
					}}
				/>
			) : null}
			{showQuietDot ? (
				<View
					testID="completion-cell-quiet-dot"
					style={{
						width: Math.max(3, Math.round(size / 6)),
						height: Math.max(3, Math.round(size / 6)),
						borderRadius: dotSize / 2,
						backgroundColor: colors.outline,
					}}
				/>
			) : null}
			{text !== undefined ? (
				<Text
					allowFontScaling={false}
					style={[styles.text, { color: inkOnFill }]}
				>
					{text}
				</Text>
			) : null}
		</>
	);

	const a11y = hidden
		? ({
				accessible: false,
				importantForAccessibility: "no-hide-descendants",
				accessibilityElementsHidden: true,
			} as const)
		: accessibilityLabel
			? ({ accessible: true, accessibilityLabel } as const)
			: ({ accessible: false } as const);

	if (!onPress) {
		return (
			<View
				testID={testID ?? `completion-cell-${state.kind}`}
				{...a11y}
				style={shape}
			>
				{content}
			</View>
		);
	}

	const slop = Math.max(0, Math.ceil((minTouchTarget - size) / 2));
	return (
		<Pressable
			testID={testID ?? `completion-cell-${state.kind}`}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ selected }}
			hitSlop={slop}
			onPress={onPress}
			style={({ pressed }) => [
				...shape,
				pressed && { opacity: opacity.pressed },
			]}
		>
			{content}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	base: {
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	/** A right triangle with its right angle in the top-right corner, painted in the surface colour. */
	notch: {
		position: "absolute",
		top: 0,
		right: 0,
		width: 0,
		height: 0,
		borderLeftColor: "transparent",
	},
	text: {
		...textStyles.footnote,
		fontVariant: ["tabular-nums"],
	},
});
