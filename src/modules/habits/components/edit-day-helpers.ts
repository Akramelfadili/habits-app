import { format } from "date-fns";

/** The sheet's title — "Tuesday, 14 July" (RL1). */
export function editDayTitle(date: Date): string {
	return format(date, "EEEE, d MMMM");
}
