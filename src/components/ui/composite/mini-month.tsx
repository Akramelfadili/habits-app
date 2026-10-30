import { space } from "@/theme/theme";
import { CompletionRows, type CompletionRowsCell } from "./completion-rows";

/** V3-06's per-habit mini month (T-10): 16 pt cells. */
export const MINI_MONTH_CELL = 16;

type MiniMonthProps = {
	/** Rows of seven (Monday → Sunday); `null` pads the days outside the month. */
	weeks: (CompletionRowsCell | null)[][];
};

/** V3-06 · per-habit mini month: one habit's month at 16 pt, binary by nature, read-only. */
export function MiniMonth({ weeks }: MiniMonthProps) {
	return (
		<CompletionRows
			rows={weeks}
			size={MINI_MONTH_CELL}
			gap={space[50]}
			testID="mini-month"
		/>
	);
}
