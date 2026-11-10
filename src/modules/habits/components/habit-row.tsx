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

const ROW_MIN_HEIGHT = minTouchTarget + 2 * space[200];

type HabitRowProps = {
	habit: Habit;
	completed: boolean;
	quantityValue?: number;
	status?: RowStatus;
	onToggle: () => void;
	onIncrement?: () => void;
	onOpenQuantitySheet?: () => void;
	onPress?: () => void;
	nameHint?: string;
	atRisk?: boolean;
	frozen?: boolean;
	circleAction?: "log" | "amount" | "details";
	isToday?: boolean;
	notDue?: boolean;
};

// The circle is a plain button, not a checkbox: "checked" would be the wrong framing for a resisted Break habit.
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

function nameLabel(habit: Habit, status?: RowStatus): string {
	return status ? `${habit.name}, ${status.text}` : habit.name;
}

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
	stackedRow: {
		paddingHorizontal: space[400],
		paddingVertical: space[400],
		gap: space[200],
	},
	nameArea: {
		minHeight: minTouchTarget,
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
