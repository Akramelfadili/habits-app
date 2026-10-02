import { useAppSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { LAST_EXPORT_SETTING_KEY } from "../constants";
import {
	useActiveHabits,
	useArchivedHabits,
} from "../repositories/habit-repository";
import {
	monthlyMenuLockedReason,
	monthlyMenuSubline,
} from "../screens/monthly-summary-helpers";
import { settingsMenuSubline } from "../screens/settings-helpers";
import { weeklyMenuSubline } from "../screens/weekly-summary-helpers";
import { defaultSummaryWeek } from "../services/weekly-summary";
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

// TODO(HAB-17): Yearly summary.
const COMING_SOON = "Coming soon";

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
 * What Today's navigation menu (HAB-14) shows on each row. Mount it only while
 * the menu is open — the weekly numbers come from the Weekly screen's own
 * hook and shouldn't be computed for a closed menu.
 */
export function useTodayMenuQueries(): TodayMenuView {
	const weekly = useWeeklySummaryQueries(defaultSummaryWeek(new Date()));
	const monthly = useMonthlySummaryQueries();
	const activeCount = useActiveHabits().length;
	const archivedCount = useArchivedHabits().length;
	const lastExport = useAppSetting(LAST_EXPORT_SETTING_KEY);
	const hasHabits = weekly.hasHabits;

	return {
		weekly: hasHabits
			? { subline: weeklyMenuSubline(weekly) }
			: { subline: "", disabledReason: "After your first full week" },
		monthly: monthlyRow(monthly),
		yearly: hasHabits
			? { subline: "", disabledReason: COMING_SOON }
			: { subline: "", disabledReason: "After three months" },
		manage: {
			subline:
				activeCount === 0 && archivedCount === 0
					? "No habits yet"
					: `${activeCount} active · ${archivedCount} archived`,
		},
		settings: { subline: settingsMenuSubline(lastExport ?? null, new Date()) },
	};
}
