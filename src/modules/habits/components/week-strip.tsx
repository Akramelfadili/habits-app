import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	Easing,
	PanResponder,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { ListItem } from "@/components/ui/composite/list-item";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { Chip } from "@/components/ui/primitives/chip";
import {
	minTouchTarget,
	motion,
	radius,
	space,
	textStyles,
} from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { useReducedMotion } from "@/utils/use-reduced-motion";
import type { WeekStripDay } from "../domain/week-strip";
import { todayCopy } from "../messages";

type WeekStripProps = {
	days: readonly WeekStripDay[];
	/** Day key of the selected day (it may be in another week than the one shown). */
	selectedKey: string;
	onSelect: (date: Date) => void;
	onPreviousWeek: () => void;
	onNextWeek: () => void;
	/** False once the shown week is the current one: there is no later week to swipe to. */
	canShowNext: boolean;
};

/** A swipe must travel this far (pt) to change the week. */
const SWIPE_DISTANCE = space[800] + space[300];
/** The number circle (V3-03), a fixed 40 pt (08.6). */
const DAY_SIZE = 40;
const DOT = 6;
const RING = 2;

/**
 * V3-03: seven days, Monday first. Today is ringed, the selected day is filled
 * with the accent, a dot appears only when everything due that day was done,
 * and future days are faint and inert. Swipe for other weeks (160 ms crossfade
 * + 12 pt slide; Reduce Motion crossfades only). VoiceOver sees one adjustable
 * element, not seven.
 */
export function WeekStrip({
	days,
	selectedKey,
	onSelect,
	onPreviousWeek,
	onNextWeek,
	canShowNext,
}: WeekStripProps) {
	const { colors } = useTheme();
	const reduceMotion = useReducedMotion();
	const accessibilityText = useAccessibilityTextSize();
	const fade = useRef(new Animated.Value(1)).current;
	const slide = useRef(new Animated.Value(0)).current;
	const weekKey = days[0]?.key;
	const shownWeek = useRef(weekKey);

	// The week slides in from the side it lies on. Whatever stops the run (a
	// newer week, unmount) leaves the strip fully visible, never mid-fade.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when the shown week changes
	useEffect(() => {
		const previous = shownWeek.current;
		shownWeek.current = weekKey;
		if (!previous || !weekKey || previous === weekKey) return;
		const direction = weekKey > previous ? 1 : -1;
		fade.setValue(0);
		slide.setValue(reduceMotion ? 0 : direction * motion.daySwitch.slide);
		const run = Animated.parallel([
			Animated.timing(fade, {
				toValue: 1,
				duration: motion.daySwitch.duration,
				easing: Easing.out(Easing.quad),
				useNativeDriver: false,
			}),
			Animated.timing(slide, {
				toValue: 0,
				duration: motion.daySwitch.duration,
				easing: Easing.out(Easing.quad),
				useNativeDriver: false,
			}),
		]);
		run.start();
		return () => {
			run.stop();
			fade.setValue(1);
			slide.setValue(0);
		};
	}, [weekKey]);

	const swipe = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_event, gesture) =>
					Math.abs(gesture.dx) > SWIPE_DISTANCE / 2 &&
					Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
				onPanResponderRelease: (_event, gesture) => {
					if (gesture.dx <= -SWIPE_DISTANCE) onNextWeek();
					else if (gesture.dx >= SWIPE_DISTANCE) onPreviousWeek();
				},
			}),
		[onNextWeek, onPreviousWeek],
	);

	const weekActions = [
		{ name: "previousWeek", label: todayCopy.previousWeek },
		...(canShowNext ? [{ name: "nextWeek", label: todayCopy.nextWeek }] : []),
	];
	const onWeekAction = (event: { nativeEvent: { actionName: string } }) => {
		if (event.nativeEvent.actionName === "previousWeek") onPreviousWeek();
		if (event.nativeEvent.actionName === "nextWeek") onNextWeek();
	};

	if (accessibilityText) {
		return (
			<ChangeDayButton
				days={days}
				selectedKey={selectedKey}
				onSelect={onSelect}
				onPreviousWeek={onPreviousWeek}
				onNextWeek={onNextWeek}
				canShowNext={canShowNext}
			/>
		);
	}

	return (
		<View testID="week-strip" {...swipe.panHandlers}>
			<Animated.View
				style={[
					styles.row,
					{ opacity: fade, transform: [{ translateX: slide }] },
				]}
			>
				{days.map((day) => {
					const isSelected = day.key === selectedKey;
					return (
						<Pressable
							key={day.key}
							testID={`week-strip-day-${day.key}`}
							disabled={day.isFuture}
							accessibilityRole="button"
							accessibilityLabel={todayCopy.stripDayLabel(
								format(day.date, "EEEE d MMMM"),
								day,
							)}
							accessibilityHint={
								day.isFuture ? undefined : todayCopy.stripDayHint
							}
							accessibilityState={{
								selected: isSelected,
								disabled: day.isFuture,
							}}
							accessibilityActions={weekActions}
							onAccessibilityAction={onWeekAction}
							onPress={() => onSelect(day.date)}
							style={styles.day}
						>
							<Text
								style={[
									styles.letter,
									{ color: day.isFuture ? colors.faint : colors.sub },
									day.isToday && { color: colors.ink, fontWeight: "600" },
								]}
							>
								{format(day.date, "EEEEE")}
							</Text>
							<View
								testID={`week-strip-number-${day.key}`}
								style={[
									styles.number,
									day.isToday && { borderWidth: RING, borderColor: colors.ink },
									isSelected && { backgroundColor: colors.accent },
								]}
							>
								<Text
									style={[
										styles.numberText,
										{
											color: isSelected
												? colors.onAccent
												: day.isFuture
													? colors.faint
													: colors.ink,
										},
									]}
								>
									{format(day.date, "d")}
								</Text>
							</View>
							<View
								testID={day.allDone ? "week-strip-dot" : undefined}
								style={[
									styles.dot,
									day.allDone && { backgroundColor: colors.accent },
								]}
							/>
						</Pressable>
					);
				})}
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	change: {
		minHeight: minTouchTarget,
		paddingVertical: space[200],
		// Only drawn at accessibility sizes, where the label wraps: 20 pt, not a pill (08.6).
		borderRadius: radius.l,
		borderWidth: 1,
		paddingHorizontal: space[400],
		justifyContent: "center",
	},
	changeText: {
		...textStyles.callout,
		fontWeight: "500",
	},
	weekButtons: {
		flexDirection: "row",
		gap: space[200],
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	day: {
		flex: 1,
		minHeight: minTouchTarget,
		alignItems: "center",
		gap: space[100],
	},
	letter: {
		...textStyles.caption,
	},
	number: {
		width: DAY_SIZE,
		height: DAY_SIZE,
		borderRadius: radius.pill,
		alignItems: "center",
		justifyContent: "center",
	},
	numberText: {
		...textStyles.callout,
		fontVariant: ["tabular-nums"],
	},
	dot: {
		width: DOT,
		height: DOT,
		borderRadius: radius.pill,
	},
});

type ChangeDayButtonProps = Pick<
	WeekStripProps,
	| "days"
	| "selectedKey"
	| "onSelect"
	| "onPreviousWeek"
	| "onNextWeek"
	| "canShowNext"
>;

/**
 * At accessibility text sizes (AX1+) seven fixed 40 pt days no longer fit, so
 * the strip becomes one button, "Friday 23 · Change day" (08.6), that opens the
 * week as a list.
 */
function ChangeDayButton({
	days,
	selectedKey,
	onSelect,
	onPreviousWeek,
	onNextWeek,
	canShowNext,
}: ChangeDayButtonProps) {
	const { colors, opacity } = useTheme();
	const [open, setOpen] = useState(false);
	const selected = days.find((day) => day.key === selectedKey) ?? days[0];
	if (!selected) return null;

	return (
		<>
			<Pressable
				testID="week-strip-change-day"
				accessibilityRole="button"
				accessibilityLabel={todayCopy.changeDayLabel(
					format(selected.date, "EEEE d"),
				)}
				onPress={() => setOpen(true)}
				style={({ pressed }) => [
					styles.change,
					{ backgroundColor: colors.card, borderColor: colors.border },
					pressed && { opacity: opacity.pressed },
				]}
			>
				<Text style={[styles.changeText, { color: colors.ink }]}>
					{todayCopy.changeDayLabel(format(selected.date, "EEEE d"))}
				</Text>
			</Pressable>
			{open ? (
				<Sheet visible onDismiss={() => setOpen(false)}>
					<SheetHeader
						title={todayCopy.changeDayTitle}
						actionLabel={todayCopy.quantityClose}
						onAction={() => setOpen(false)}
					/>
					<View style={styles.weekButtons}>
						<Chip label={todayCopy.previousWeek} onPress={onPreviousWeek} />
						<Chip
							label={todayCopy.nextWeek}
							onPress={onNextWeek}
							disabled={!canShowNext}
						/>
					</View>
					{days.map((day) => (
						<ListItem
							key={day.key}
							title={format(day.date, "EEEE d MMMM")}
							subtitle={day.isToday ? todayCopy.todayWord : undefined}
							onPress={
								day.isFuture
									? undefined
									: () => {
											onSelect(day.date);
											setOpen(false);
										}
							}
							accessibilityLabel={format(day.date, "EEEE d MMMM")}
						/>
					))}
				</Sheet>
			) : null}
		</>
	);
}
