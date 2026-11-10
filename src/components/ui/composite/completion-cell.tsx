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

// Each state differs from the others by shape or text, not colour alone.
export type CompletionCellState =
	| { kind: "level"; level: IntensityLevel }
	| { kind: "frozen" }
	| { kind: "bonus" }
	| { kind: "not-due" }
	| { kind: "before-start" }
	| { kind: "nothing-logged" }
	| { kind: "future" }
	| { kind: "paused" }
	| { kind: "reset" };

type CompletionCellProps = {
	state: CompletionCellState;
	size: number;
	today?: boolean;
	selected?: boolean;
	text?: string;
	accessibilityLabel?: string;
	accessibilityHint?: string;
	hidden?: boolean;
	surface?: string;
	onPress?: () => void;
	testID?: string;
};

// Never below 3 pt so the notch survives at 12 pt.
export function notchSize(size: number): number {
	return Math.max(3, Math.round(size * notchShare));
}

// Only a cell given `onPress` is a button; every other cell is below 44 pt by design and not tappable.
export function CompletionCell({
	state,
	size,
	today = false,
	selected = false,
	text,
	accessibilityLabel,
	accessibilityHint,
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
			{state.kind === "paused" ? (
				<Hatch size={size} color={colors.outline} />
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
			accessibilityHint={accessibilityHint}
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

// A shape a colour-blind eye can tell from an empty box.
function Hatch({ size, color }: { size: number; color: string }) {
	const step = Math.max(3, Math.round(size / 4));
	const count = Math.ceil((size * 2) / step) + 1;
	return (
		<View
			testID="completion-cell-hatch"
			pointerEvents="none"
			style={StyleSheet.absoluteFill}
		>
			{Array.from({ length: count }, (_, index) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: a fixed run of identical lines
					key={index}
					style={{
						position: "absolute",
						left: -size / 2,
						top: index * step - size / 2,
						width: size * 2,
						height: 1,
						backgroundColor: color,
						transform: [{ rotate: "-45deg" }],
					}}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	base: {
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
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
