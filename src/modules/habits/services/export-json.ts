import { format } from "date-fns";
import { describeFrequency } from "./export-csv";
import type { ExportModel } from "./export-data";

/**
 * The JSON layout of a data export (HAB-15): the same facts as the CSV, nested
 * the way they belong — each habit carries its own logs, notes and frozen
 * days. `version` lets a future importer tell layouts apart.
 */

const EXPORT_JSON_VERSION = 1;

const dateOnly = (date: Date) => format(date, "yyyy-MM-dd");

export async function toJson(
	model: ExportModel,
	onProgress: (logsDone: number) => Promise<void> | void = () => {},
): Promise<string> {
	const habits = [];
	let logsDone = 0;

	for (const record of model.habits) {
		const { habit } = record;
		habits.push({
			id: habit.id,
			name: habit.name,
			category: habit.category.name,
			direction: habit.direction,
			targetType: habit.targetType,
			targetAmount: habit.targetAmount,
			targetUnit: habit.targetUnit,
			frequency: describeFrequency(habit.frequency),
			status: habit.archivedAt ? "archived" : "active",
			createdOn: dateOnly(habit.createdAt),
			archivedOn: habit.archivedAt ? dateOnly(habit.archivedAt) : null,
			currentStreak: record.currentStreak,
			longestStreak: record.longestStreak,
			entries: record.logs,
			notes: record.notes,
			frozenDays: record.frozenDates,
		});
		logsDone += record.logs.length;
		await onProgress(logsDone);
	}

	return JSON.stringify(
		{ version: EXPORT_JSON_VERSION, exportedOn: model.exportedOn, habits },
		null,
		2,
	);
}
