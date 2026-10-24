import { useAppSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { LAST_EXPORT_SETTING_KEY } from "../constants";
import {
	monthlyMenuLockedReason,
	monthlyMenuSubline,
} from "../presenters/monthly-summary-helpers";
import { settingsMenuSubline } from "../presenters/settings-helpers";
import { weeklyMenuSubline } from "../presenters/weekly-summary-helpers";
import {
	yearlyMenuLockedReason,
	yearlyMenuSubline,
} from "../presenters/yearly-summary-helpers";
import {
	useActiveHabits,
	useArchivedHabits,
	useHabitsList,
} from "../repositories/habit-repository";
import { historyStart } from "../services/monthly-summary";
import { defaultSummaryWeek } from "../services/weekly-summary";
import { yearUnlock } from "../services/yearly-summary";
import type { Habit } from "../types";
import {
	type MonthlySummaryView,
	useMonthlySummaryQueries,
} from "./use-monthly-summary-queries";
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

function monthlyRow(monthly: MonthlySummaryView): TodayMenuRow {
	switch (monthly.state) {
		case "ready":
			return { subline: monthlyMenuSubline(monthly.summary) };
		case "too-early":
			return {
				subline: "",
				disabledReason: monthlyMenuLockedReason(monthly.unlock),
			};
		default:
			return { subline: "", disabledReason: "After your first month" };
	}
}

/**
 * Yearly's row from the habits alone — the year's entries are never read for a
 * subline (the full summary is the screen's job, not the menu's).
 */
function yearlyRow(habits: readonly Habit[], today: Date): TodayMenuRow {
	const firstDay = historyStart(habits);
	if (!firstDay) return { subline: "", disabledReason: "After three months" };
	const unlock = yearUnlock(firstDay, today);
	return unlock.isUnlocked
		? { subline: yearlyMenuSubline(firstDay, today) }
		: { subline: "", disabledReason: yearlyMenuLockedReason(unlock) };
}

/**
 * What Today's navigation menu (HAB-14) shows on each row. Mount it only while
 * the menu is open — the weekly numbers come from the Weekly screen's own
 * hook and shouldn't be computed for a closed menu.
 */
export function useTodayMenuQueries(): TodayMenuView {
	const weekly = useWeeklySummaryQueries(defaultSummaryWeek(new Date()));
	const monthly = useMonthlySummaryQueries();
	const activeCount = useActiveHabits().habits.length;
	const archivedCount = useArchivedHabits().habits.length;
	const lastExport = useAppSetting(LAST_EXPORT_SETTING_KEY);
	const { habits } = useHabitsList();
	const hasHabits = weekly.hasHabits;

	return {
		weekly: hasHabits
			? { subline: weeklyMenuSubline(weekly) }
			: { subline: "", disabledReason: "After your first full week" },
		monthly: monthlyRow(monthly),
		yearly: yearlyRow(habits, new Date()),
		manage: {
			subline:
				activeCount === 0 && archivedCount === 0
					? "No habits yet"
					: `${activeCount} active · ${archivedCount} archived`,
		},
		settings: { subline: settingsMenuSubline(lastExport ?? null, new Date()) },
	};
}
