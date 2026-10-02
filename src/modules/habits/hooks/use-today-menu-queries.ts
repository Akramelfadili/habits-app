import {
	useActiveHabits,
	useArchivedHabits,
} from "../repositories/habit-repository";
import { weeklyMenuSubline } from "../screens/weekly-summary-helpers";
import { defaultSummaryWeek } from "../services/weekly-summary";
import { useWeeklySummaryQueries } from "./use-weekly-summary-queries";

export type TodayMenuRow = {
	subline: string;
	/** Set when the row can't be used; replaces the subline. */
	disabledReason?: string;
};

export type TodayMenuView = {
	weekly: TodayMenuRow;
	monthly: TodayMenuRow;
	yearly: TodayMenuRow;
	manage: TodayMenuRow;
	settings: TodayMenuRow;
};

// TODO(HAB-15): Settings (the screen, and its real subline) doesn't exist yet.
// TODO(HAB-16): Monthly summary.
// TODO(HAB-17): Yearly summary.
const COMING_SOON = "Coming soon";

/**
 * What Today's navigation menu (HAB-14) shows on each row. Mount it only while
 * the menu is open — the weekly numbers come from the Weekly screen's own
 * hook and shouldn't be computed for a closed menu.
 */
export function useTodayMenuQueries(): TodayMenuView {
	const weekly = useWeeklySummaryQueries(defaultSummaryWeek(new Date()));
	const activeCount = useActiveHabits().length;
	const archivedCount = useArchivedHabits().length;
	const hasHabits = weekly.hasHabits;

	return {
		weekly: hasHabits
			? { subline: weeklyMenuSubline(weekly) }
			: { subline: "", disabledReason: "After your first full week" },
		monthly: hasHabits
			? { subline: "", disabledReason: COMING_SOON }
			: { subline: "", disabledReason: "After your first month" },
		yearly: hasHabits
			? { subline: "", disabledReason: COMING_SOON }
			: { subline: "", disabledReason: "After three months" },
		manage: {
			subline:
				activeCount === 0 && archivedCount === 0
					? "No habits yet"
					: `${activeCount} active · ${archivedCount} archived`,
		},
		settings: {
			subline: "Appearance, evening review, export",
			disabledReason: COMING_SOON,
		},
	};
}
