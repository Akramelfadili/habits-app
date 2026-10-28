import { Pressable, StyleSheet, Text, View } from "react-native";
import { CountButton } from "@/components/ui/primitives/count-button";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import {
	habitAccentInk,
	habitAccentTint,
	minTouchTarget,
	space,
	textStyles,
} from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { todayCopy } from "../messages";
import type { RowStatus } from "../presenters/today-row-status";
import type { Habit } from "../types";
import { categorySymbol } from "./category-symbol";
import { CompletionCircle } from "./completion-circle";

/** V3-13 / T-18: a flat 60 pt row — 44 pt circle plus `space[200]` above and below. */
const ROW_MIN_HEIGHT = minTouchTarget + 2 * space[200];

type HabitRowProps = {
	habit: Habit;
	completed: boolean;
	/** The shown day's logged amount — only meaningful for a quantity habit (HAB-07). */
	quantityValue?: number;
	/** The line under the name (see `todayRowStatus`); none for a plain habit with no streak. */
	status?: RowStatus;
	/** Toggles done/undone — Build and Break habits. */
	onToggle: () => void;
	/** A tap on a quantity habit's circle adds one (D6). */
	onIncrement?: () => void;
	/** The count button and the circle's long-press open the quantity sheet (HAB-34). */
	onOpenQuantitySheet?: () => void;
	/** The name area: opens Detail — or, on an at-risk row, the streak sheet. The circle always logs. */
	onPress?: () => void;
	/** What the name area opens, for VoiceOver ("Opens details."). */
	nameHint?: string;
	/** Streak at risk (HAB-33): the amber dot on the circle. */
	atRisk?: boolean;
	/** Frozen day (RL3): violet circle. */
	frozen?: boolean;
	/**
	 * What the circle does when it isn't the plain log: "amount" opens the quantity
	 * sheet (Edit this day), "details" opens Detail (a bonus already logged). VoiceOver
	 * says so instead of "log one more" / "mark done".
	 */
	circleAction?: "log" | "amount" | "details";
	/** False for a day in the past (Edit this day): VoiceOver asks "resisted?", not "resisted today?". */
	isToday?: boolean;
	/** Not due on this day (T3, the fold row): a dashed circle; a log is a bonus. */
	notDue?: boolean;
};

/**
 * What VoiceOver says for the circle (08.3): the state is in the words, since a
 * resisted Break habit announced as "checked" is the "did the thing" framing
 * HAB-04 exists to avoid. The circle is a plain button, not a checkbox.
 */
function circleAccessibility(
	habit: Habit,
	completed: boolean,
	quantity: { value: number; target: number } | null,
	notDue: boolean,
	isToday: boolean,
): { label: string; hint: string } {
	const isBreak = habit.direction === "break";
	if (notDue) {
		return {
			label: todayCopy.circleBonus(habit.name),
			hint: todayCopy.logBonus,
		};
	}
	if (quantity) {
		return {
			label: todayCopy.circleAddOne(
				habit.name,
				quantity.value,
				quantity.target,
			),
			hint: todayCopy.logOneMore,
		};
	}
	if (isBreak) {
		return completed
			? {
					label: todayCopy.circleResisted(habit.name),
					hint: todayCopy.markNotResisted,
				}
			: {
					label: todayCopy.circleNotResisted(habit.name, isToday),
					hint: todayCopy.markResisted,
				};
	}
	return completed
		? { label: todayCopy.circleDone(habit.name), hint: todayCopy.markNotDone }
		: { label: todayCopy.circleNotDone(habit.name), hint: todayCopy.markDone };
}

/** "Drink water, 5 of 8 glasses" — the name and the line under it as one phrase. */
function nameLabel(habit: Habit, status?: RowStatus): string {
	return status ? `${habit.name}, ${status.text}` : habit.name;
}

/**
 * V3-13, a Today row: icon square, name and status line (the name area opens
 * Detail), a count button for a quantity habit, and the completion circle.
 * Two tap zones, so a mis-tap on the name never logs. At accessibility text
 * sizes the row stacks: the name on top, count button and circle on their own
 * line, each with its 44 pt target (08.6a).
 */
export function HabitRow({
	habit,
	completed,
	quantityValue,
	status,
	onToggle,
	onIncrement,
	onOpenQuantitySheet,
	onPress,
	nameHint = todayCopy.openDetails,
	atRisk = false,
	frozen = false,
	notDue = false,
	circleAction = "log",
	isToday = true,
}: HabitRowProps) {
	const { colors, scheme, opacity } = useTheme();
	const stacked = useAccessibilityTextSize();
	const isQuantity = habit.targetType === "quantity" && !notDue;
	const value = quantityValue ?? 0;
	const target = habit.targetAmount ?? 0;
	const base = circleAccessibility(
		habit,
		completed,
		isQuantity ? { value, target } : null,
		notDue,
		isToday,
	);
	const circle =
		circleAction === "amount"
			? {
					label: todayCopy.circleSetAmount(habit.name, value, target),
					hint: todayCopy.openQuantity,
				}
			: circleAction === "details"
				? { label: base.label, hint: todayCopy.openDetails }
				: base;
	const statusColor =
		status?.tone === "warning"
			? colors.warnInk
			: status?.tone === "frozen"
				? colors.frozenInk
				: colors.sub;

	const nameContent = (
		<>
			<IconBadge
				symbol={categorySymbol(habit.category)}
				accent={{
					tint: habitAccentTint(habit.category.hue, scheme),
					ink: habitAccentInk(habit.category.hue, scheme),
				}}
			/>
			<View style={styles.nameColumn}>
				<Text style={[styles.name, { color: colors.ink }]}>{habit.name}</Text>
				{status ? (
					<Text style={[styles.status, { color: statusColor }]}>
						{status.text}
					</Text>
				) : null}
			</View>
		</>
	);
	// With no handler (a row in a sheet, where there is no Detail to open) the
	// name is plain text: one VoiceOver stop, nothing to tap.
	const nameArea = onPress ? (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={nameLabel(habit, status)}
			accessibilityHint={nameHint}
			onPress={onPress}
			style={({ pressed }) => [
				styles.nameArea,
				pressed && { opacity: opacity.pressed },
			]}
		>
			{nameContent}
		</Pressable>
	) : (
		<View
			accessible
			accessibilityLabel={nameLabel(habit, status)}
			style={styles.nameArea}
		>
			{nameContent}
		</View>
	);

	const controls = (
		<View style={styles.controls}>
			{isQuantity && onOpenQuantitySheet ? (
				<CountButton
					label={todayCopy.countButton(value, target)}
					onPress={onOpenQuantitySheet}
					accessibilityLabel={todayCopy.countAmount(value, target)}
					accessibilityHint={todayCopy.openQuantity}
				/>
			) : null}
			<CompletionCircle
				completed={completed}
				onPress={isQuantity ? (onIncrement ?? onToggle) : onToggle}
				onLongPress={isQuantity ? onOpenQuantitySheet : undefined}
				accessibilityLabel={circle.label}
				accessibilityHint={circle.hint}
				direction={habit.direction}
				atRisk={atRisk}
				frozen={frozen}
				notDue={notDue}
				role="button"
				progress={isQuantity && target ? value / target : undefined}
			/>
		</View>
	);

	return (
		<View style={stacked ? styles.stackedRow : styles.row}>
			{nameArea}
			{controls}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		minHeight: ROW_MIN_HEIGHT,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: space[350],
		paddingVertical: space[200],
		gap: space[200],
	},
	/** AX sizes restore 16 pt padding and stack the row (F-04, 08.6a). */
	stackedRow: {
		paddingHorizontal: space[400],
		paddingVertical: space[400],
		gap: space[200],
	},
	nameArea: {
		flex: 1,
		alignSelf: "stretch",
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
	},
	nameColumn: {
		flex: 1,
		gap: space[50],
	},
	name: {
		...textStyles.body,
		fontWeight: "500",
	},
	status: {
		...textStyles.footnote,
	},
	controls: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		gap: space[100],
	},
});
