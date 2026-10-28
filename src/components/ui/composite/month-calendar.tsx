import { StyleSheet, Text, View } from "react-native";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { CompletionRows, type CompletionRowsCell } from "./completion-rows";

/** V3-06's month calendar cell (T-10): 40 pt, a real tap target with its day number. */
export const CALENDAR_CELL = 40;

type MonthCalendarProps = {
	/** Seven weekday letters, Monday first. */
	letters: string[];
	/** Rows of seven (Monday → Sunday); `null` pads the days outside the month. */
	weeks: (CompletionRowsCell | null)[][];
};

/**
 * V3-06 · month calendar: a weekday axis over 40 pt day cells that carry their
 * number. A day with `onPress` is a button — Month's day-detail entry (P13);
 * the ring marks today and the selected day. The cells spread across the width
 * so the axis letters sit over their columns.
 */
export function MonthCalendar({ letters, weeks }: MonthCalendarProps) {
	const { colors } = useTheme();

	return (
		<View testID="month-calendar" style={styles.calendar}>
			<View
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				style={styles.letters}
			>
				{letters.map((letter, index) => (
					<Text
						// biome-ignore lint/suspicious/noArrayIndexKey: the seven weekday columns are fixed
						key={index}
						style={[styles.letter, { color: colors.faint }]}
					>
						{letter}
					</Text>
				))}
			</View>
			<CompletionRows
				rows={weeks}
				size={CALENDAR_CELL}
				gap={space[150]}
				spread
				testID="month-calendar-rows"
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	calendar: {
		gap: space[100],
	},
	letters: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	letter: {
		...textStyles.caption,
		width: CALENDAR_CELL,
		textAlign: "center",
	},
});
