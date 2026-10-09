import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/use-theme";
import type { HabitDirection } from "../types";

const SIZE = 28;
const RADIUS = SIZE / 2;

type CompletionCircleProps = {
	completed: boolean;
	onPress: () => void;
	accessibilityLabel: string;
	/** Build = filled-black-on-done (default). Break = outline-only, never filled (HAB-04). */
	direction?: HabitDirection;
	/**
	 * Streak-at-risk (HAB-08): a missed-yesterday day a freeze could still
	 * cover. Documented only for Break (solid amber ring, no checkmark) — Build
	 * has no at-risk circle state, so this is ignored when `direction` is "build".
	 */
	atRisk?: boolean;
	/**
	 * 0–1 fill for a quantity habit logged below its target (HAB-07) — ignored
	 * once `completed` (done always wins, however it got there), and for Break
	 * habits (quantity + Break is out of scope for V1).
	 */
	progress?: number;
	/**
	 * "checkbox" (default) toggles instantly. A quantity habit (HAB-07) opens a
	 * sheet instead, so it's a "button" — checked/unchecked semantics don't
	 * apply to "open this habit's log."
	 */
	role?: "checkbox" | "button";
};

/**
 * A two-half rotating-wedge pie fill, clipped to the circle by the parent.
 * Each half is a plain rect rotated around the midpoint of its flat (inner)
 * edge — the circle's center — so it sweeps a wedge into view; no SVG needed.
 */
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

/**
 * Habit completion control (design-system.md's "Completion circle" — Build
 * and Break variants). Build: empty outline / done filled + checkmark /
 * partial pie-fill for a quantity habit logged below its target (HAB-07).
 * Break: outline-only in both states — dashed when empty, solid ink ring +
 * ink checkmark when resisted — so it can never read as a filled Build circle
 * at a glance, per HAB-04's hard rule (quantity + Break is out of scope).
 */
export function CompletionCircle({
	completed,
	onPress,
	accessibilityLabel,
	direction = "build",
	progress,
	role = "checkbox",
	atRisk = false,
}: CompletionCircleProps) {
	const { colors, opacity } = useTheme();
	const isBreak = direction === "break";
	const showPartial = !completed && !isBreak && !!progress && progress > 0;
	const showAtRisk = !completed && isBreak && atRisk;

	return (
		<Pressable
			accessibilityRole={role}
			accessibilityLabel={accessibilityLabel}
			accessibilityState={
				role === "checkbox" ? { checked: completed } : undefined
			}
			hitSlop={8}
			onPress={onPress}
			style={({ pressed }) => [
				styles.circle,
				isBreak
					? completed
						? { borderWidth: 2, borderColor: colors.ink }
						: showAtRisk
							? { borderWidth: 2, borderColor: colors.warnInk }
							: {
									borderWidth: 2,
									borderStyle: "dashed",
									borderColor: colors.outline,
								}
					: completed
						? { backgroundColor: colors.ink }
						: showPartial
							? { backgroundColor: colors.border, overflow: "hidden" }
							: { borderWidth: 2, borderColor: colors.outline },
				pressed && { opacity: opacity.pressed },
			]}
		>
			{completed ? (
				<SymbolView
					name="checkmark"
					size={14}
					tintColor={isBreak ? colors.ink : colors.onAccent}
					weight="bold"
				/>
			) : showPartial ? (
				<PieFill progress={progress} color={colors.ink} />
			) : null}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	circle: {
		width: SIZE,
		height: SIZE,
		borderRadius: RADIUS,
		alignItems: "center",
		justifyContent: "center",
	},
	rightHalfClip: {
		position: "absolute",
		left: RADIUS,
		top: 0,
		width: RADIUS,
		height: SIZE,
		overflow: "hidden",
	},
	leftHalfClip: {
		position: "absolute",
		left: 0,
		top: 0,
		width: RADIUS,
		height: SIZE,
		overflow: "hidden",
	},
	half: {
		width: RADIUS,
		height: SIZE,
	},
});
