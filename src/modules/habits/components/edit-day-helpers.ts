import { format } from "date-fns";

export function editDayTitle(date: Date): string {
	return format(date, "EEEE, d MMMM");
}
