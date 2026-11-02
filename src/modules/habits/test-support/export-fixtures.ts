import type { ExportSource } from "../domain/export-data";
import {
	categoryNamed,
	makeHabit,
	TEST_BUILT_IN_CATEGORIES,
} from "./habit-builder";

/** Wednesday 16 Sep 2026 — the day every export test runs "on". */
export const EXPORT_TODAY = new Date(2026, 8, 16, 12);

/**
 * Two active habits and one archived, covering every row kind the export
 * writes: a plain log, a quantity log, a note, a frozen day, and a habit with
 * no logs at all.
 */
export function makeExportSource(): ExportSource {
	const created = new Date(2026, 8, 1);
	return {
		habits: [
			makeHabit({
				id: 1,
				name: "Café, then “read”",
				category: categoryNamed("Morning"),
				createdAt: created,
			}),
			makeHabit({
				id: 2,
				name: "Water",
				targetType: "quantity",
				targetAmount: 8,
				targetUnit: "glasses",
				frequency: { type: "weekdays", days: [1, 3, 5] },
				createdAt: created,
			}),
			makeHabit({
				id: 3,
				name: "Old habit",
				archivedAt: new Date(2026, 8, 10),
				createdAt: created,
			}),
		],
		entries: [
			{ id: 1, habitId: 1, date: "2026-09-14", createdAt: created },
			{ id: 2, habitId: 1, date: "2026-09-15", createdAt: created },
			{ id: 3, habitId: 2, date: "2026-09-14", value: 5, createdAt: created },
			{ id: 4, habitId: 3, date: "2026-09-05", createdAt: created },
		],
		notes: [
			{ habitId: 1, date: "2026-09-15", note: 'Línea uno, "dos"\nlínea tres' },
		],
		frozenDays: [{ id: 1, habitId: 2, date: "2026-09-02", createdAt: created }],
		reminders: [
			{
				id: 1,
				habitId: 1,
				hour: 18,
				minute: 30,
				weekdays: [4],
				enabled: true,
			},
			{
				id: 2,
				habitId: 1,
				hour: 7,
				minute: 0,
				weekdays: [2, 4],
				enabled: false,
			},
		],
		categories: [...TEST_BUILT_IN_CATEGORIES, categoryNamed("Morning")],
	};
}
