import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { minTouchTarget, motion, radius } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useHaptics } from "@/utils/use-haptics";
import { useReducedMotion } from "@/utils/use-reduced-motion";
import type { HabitDirection } from "../types";

const SIZE = 28;
const HALF = SIZE / 2;
const RING = 2;
const CHECK_SIZE = 14;
const DOT = 8;

type CompletionCircleProps = {
	completed: boolean;
	onPress: () => void;
	onLongPress?: () => void;
	accessibilityLabel: string;
	accessibilityHint?: string;
	direction?: HabitDirection;
	atRisk?: boolean;
	progress?: number;
	frozen?: boolean;
	notDue?: boolean;
	role?: "checkbox" | "button";
	disabled?: boolean;
};

// Two rotated rects sweep a wedge into view (no SVG), clipped to the circle by the parent.
function PieFill({ progress, color }: { progress: number; color: string }) {
	const angle = Math.min(1, Math.max(0, progress)) * 360;
	const rightRotation = Math.min(angle, 180) - 180;
	const leftRotation = Math.max(angle, 180) - 360;

	return (
		<>
			<View style={styles.rightHalfClip}>
				<View
					style={[
						styles.half,
						{
							backgroundColor: color,
							transform: [{ rotate: `${rightRotation}deg` }],
							transformOrigin: "0% 50%",
						},
					]}
				/>
			</View>
			<View style={styles.leftHalfClip}>
				<View
					style={[
						styles.half,
						{
							backgroundColor: color,
							transform: [{ rotate: `${leftRotation}deg` }],
							transformOrigin: "100% 50%",
						},
					]}
				/>
			</View>
		</>
	);
}

// Every state differs in shape as well as colour. The 44 pt hit area is the Pressable; the 28 pt circle sits inside it.
export function CompletionCircle({
	completed,
	onPress,
	onLongPress,
	accessibilityLabel,
	accessibilityHint,
	direction = "build",
	progress,
	atRisk = false,
	frozen = false,
	notDue = false,
	role = "checkbox",
	disabled = false,
}: CompletionCircleProps) {
	const { colors, opacity } = useTheme();
	const reduceMotion = useReducedMotion();
	const haptics = useHaptics();
	const isBreak = direction === "break";
	const showPartial = !completed && !isBreak && !!progress && progress > 0;

	const face = frozen
		? {
				backgroundColor: colors.frozenBg,
				borderWidth: RING,
				borderStyle: "dashed" as const,
				borderColor: colors.frozenInk,
			}
		: completed
			? isBreak
				? {
						backgroundColor: colors.warnTint,
						borderWidth: RING,
						borderColor: colors.warnInk,
					}
				: { backgroundColor: colors.accent }
			: showPartial
				? { backgroundColor: colors.track, overflow: "hidden" as const }
				: {
						borderWidth: RING,
						borderColor: isBreak ? colors.warnInk : colors.outline,
						borderStyle: notDue ? ("dashed" as const) : ("solid" as const),
					};

	return (
		<Pressable
			accessibilityRole={role}
			accessibilityLabel={accessibilityLabel}
			accessibilityHint={accessibilityHint}
			accessibilityState={{
				...(role === "checkbox" ? { checked: completed } : {}),
				disabled,
			}}
			disabled={disabled}
			onPress={() => {
				haptics.selection();
				onPress();
			}}
			onLongPress={onLongPress}
			style={({ pressed }) => [
				styles.hit,
				pressed &&
					(reduceMotion
						? { opacity: opacity.pressed }
						: { transform: [{ scale: motion.press.scale.min }] }),
			]}
		>
			<View testID="completion-circle-face" style={[styles.circle, face]}>
				{completed ? (
					<SymbolView
						name="checkmark"
						size={CHECK_SIZE}
						tintColor={isBreak ? colors.warnInk : colors.onAccent}
						weight="bold"
					/>
				) : showPartial ? (
					<PieFill progress={progress} color={colors.accent} />
				) : null}
			</View>
			{atRisk && !completed ? (
				<View
					testID="completion-circle-at-risk"
					style={[
						styles.dot,
						{ backgroundColor: colors.warnInk, borderColor: colors.card },
					]}
				/>
			) : null}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	hit: {
		width: minTouchTarget,
		height: minTouchTarget,
		alignItems: "center",
		justifyContent: "center",
	},
	circle: {
		width: SIZE,
		height: SIZE,
		borderRadius: radius.pill,
		alignItems: "center",
		justifyContent: "center",
	},
	dot: {
		position: "absolute",
		top: (minTouchTarget - SIZE) / 2 - DOT / 4,
		right: (minTouchTarget - SIZE) / 2 - DOT / 4,
		width: DOT,
		height: DOT,
		borderRadius: radius.pill,
		borderWidth: 1,
	},
	rightHalfClip: {
		position: "absolute",
		left: HALF,
		top: 0,
		width: HALF,
		height: SIZE,
		overflow: "hidden",
	},
	leftHalfClip: {
		position: "absolute",
		left: 0,
		top: 0,
		width: HALF,
		height: SIZE,
		overflow: "hidden",
	},
	half: {
		width: HALF,
		height: SIZE,
	},
});
