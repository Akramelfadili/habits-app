import { format } from "date-fns";
import { useEffect, useMemo, useRef } from "react";
import {
	Animated,
	Easing,
	PanResponder,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import {
	minTouchTarget,
	motion,
	radius,
	space,
	textStyles,
} from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useReducedMotion } from "@/utils/use-reduced-motion";
import type { WeekStripDay } from "../domain/week-strip";

type WeekStripProps = {
	days: readonly WeekStripDay[];
	/** Day key of the selected day (it may be in another week than the one shown). */
	selectedKey: string;
	/** What the selected day's progress reads ("1 of 5 done"), for the VoiceOver label. */
	selectedSummary: string;
	onSelect: (date: Date) => void;
	/** VoiceOver's swipe up/down: the previous or next selectable day. */
	onStepDay: (step: -1 | 1) => void;
	onPreviousWeek: () => void;
	onNextWeek: () => void;
	/** −1 / +1 after a swipe, so the week slides in from the right side. */
	direction: number;
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
	selectedSummary,
	onSelect,
	onStepDay,
	onPreviousWeek,
	onNextWeek,
	direction,
}: WeekStripProps) {
	const { colors } = useTheme();
	const reduceMotion = useReducedMotion();
	const fade = useRef(new Animated.Value(1)).current;
	const slide = useRef(new Animated.Value(0)).current;
	const weekKey = days[0]?.key;

	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when the shown week changes
	useEffect(() => {
		if (direction === 0) return;
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
		return () => run.stop();
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

	const selected = days.find((day) => day.key === selectedKey);
	const label = selected
		? `${format(selected.date, "EEEE d")}${selected.isToday ? ", today" : ""}, selected, ${selectedSummary}`
		: format(days[0]?.date ?? new Date(), "'Week of' d MMMM");

	return (
		<View
			testID="week-strip"
			accessible
			accessibilityRole="adjustable"
			accessibilityLabel={label}
			accessibilityActions={[
				{ name: "increment", label: "Next day" },
				{ name: "decrement", label: "Previous day" },
			]}
			onAccessibilityAction={(event) => {
				if (event.nativeEvent.actionName === "increment") onStepDay(1);
				if (event.nativeEvent.actionName === "decrement") onStepDay(-1);
			}}
			{...swipe.panHandlers}
		>
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
							accessibilityLabel={format(day.date, "EEEE d")}
							accessibilityState={{
								selected: isSelected,
								disabled: day.isFuture,
							}}
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
