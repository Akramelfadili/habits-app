import { format } from "date-fns";
import type { Frequency, IsoWeekday } from "../types";
import type { ExportModel } from "./export-data";

/**
 * The CSV layout of a data export (HAB-15) — one file, one row per fact,
 * told apart by `record_type`:
 *
 *   habit       one per habit, including habits with no logs; carries the
 *               habit's settings, category name and both streaks
 *   entry       one per logged day: `date`, `value` (quantity habits),
 *               `completed`
 *   note        one per day note: `date`, `note`
 *   frozen_day  one per streak freeze: `date`
 *
 * Child rows repeat `habit_id` and `habit_name` so a row is readable on its
 * own; columns that don't apply are left empty. Quoting follows RFC 4180
 * (commas, quotes and line breaks inside a field), rows end CRLF, and the file
 * starts with a UTF-8 byte-order mark so Numbers and Excel read accents right.
 */

export const CSV_COLUMNS = [
	"record_type",
	"habit_id",
	"habit_name",
	"category",
	"direction",
	"target_type",
	"target_amount",
	"target_unit",
	"frequency",
	"status",
	"created_on",
	"archived_on",
	"current_streak",
	"longest_streak",
	"date",
	"value",
	"completed",
	"note",
] as const;

type Column = (typeof CSV_COLUMNS)[number];
type Row = Partial<Record<Column, string | number | boolean | null>>;

const BYTE_ORDER_MARK = "﻿";
const LINE_END = "\r\n";

const WEEKDAY_NAMES: Record<IsoWeekday, string> = {
	1: "Mon",
	2: "Tue",
	3: "Wed",
	4: "Thu",
	5: "Fri",
	6: "Sat",
	7: "Sun",
};

/** "daily", "weekdays:Mon|Wed|Fri", "per-week:3" — stable and easy to filter on. */
export function describeFrequency(frequency: Frequency): string {
	switch (frequency.type) {
		case "daily":
			return "daily";
		case "weekdays":
			return `weekdays:${frequency.days.map((day) => WEEKDAY_NAMES[day]).join("|")}`;
		case "per-week":
			return `per-week:${frequency.timesPerWeek}`;
	}
}

export function escapeCsvField(
	value: string | number | boolean | null | undefined,
) {
	if (value === null || value === undefined) return "";
	const text = String(value);
	return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toLine(row: Row): string {
	return CSV_COLUMNS.map((column) => escapeCsvField(row[column])).join(",");
}

/** Local calendar day — the app never deals in UTC dates. */
const dateOnly = (date: Date) => format(date, "yyyy-MM-dd");

/**
 * Serializes habit by habit, awaiting `onProgress(logsWritten)` after each so
 * the caller can report progress, yield to the UI and honour a cancel.
 */
export async function toCsv(
	model: ExportModel,
	onProgress: (logsDone: number) => Promise<void> | void = () => {},
): Promise<string> {
	const lines: string[] = [CSV_COLUMNS.join(",")];
	let logsDone = 0;

	for (const record of model.habits) {
		const { habit } = record;
		const owner = { habit_id: habit.id, habit_name: habit.name };
		lines.push(
			toLine({
				record_type: "habit",
				...owner,
				category: habit.category.name,
				direction: habit.direction,
				target_type: habit.targetType,
				target_amount: habit.targetAmount,
				target_unit: habit.targetUnit,
				frequency: describeFrequency(habit.frequency),
				status: habit.archivedAt ? "archived" : "active",
				created_on: dateOnly(habit.createdAt),
				archived_on: habit.archivedAt ? dateOnly(habit.archivedAt) : null,
				current_streak: record.currentStreak,
				longest_streak: record.longestStreak,
			}),
		);
		for (const log of record.logs) {
			lines.push(
				toLine({
					record_type: "entry",
					...owner,
					date: log.date,
					value: log.value,
					completed: log.completed,
				}),
			);
		}
		for (const note of record.notes) {
			lines.push(
				toLine({
					record_type: "note",
					...owner,
					date: note.date,
					note: note.note,
				}),
			);
		}
		for (const { date } of record.frozenDays) {
			lines.push(toLine({ record_type: "frozen_day", ...owner, date }));
		}
		logsDone += record.logs.length;
		await onProgress(logsDone);
	}

	return BYTE_ORDER_MARK + lines.join(LINE_END) + LINE_END;
}
