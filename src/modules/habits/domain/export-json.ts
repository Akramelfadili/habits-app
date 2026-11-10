import { format } from "date-fns";
import { getAppInfo } from "@/lib/diagnostics/app-info";
import { describeFrequency } from "./export-csv";
import type { ExportModel, ExportSettings } from "./export-data";

/**
 * The JSON layout of a data export, version 2: a lossless copy of what the person owns, nested
 * the way it belongs: each habit carries its own logs, notes, frozen days and reminders. Field by
 * field: docs/how-to/export-format.md.
 *
 * - `version` is this layout; `schemaVersion` is the database that wrote it.
 * - Ids are local to the device that wrote the file (`idsAreLocal`): they tie a habit to its
 *   category and reminders inside this file and mean nothing elsewhere.
 * - `derived` holds what the app can recompute (streaks, status). An importer ignores it.
 * - `notesIncluded: false` means the person left notes out: no `notes` key on any habit, and no
 *   note text anywhere.
 */

const EXPORT_JSON_VERSION = 2;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const dateOnly = (date: Date) => format(date, "yyyy-MM-dd");

const timeOfDay = (hour: number, minute: number) =>
	`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

export type ExportDocumentV2 = {
	version: 2;
	schemaVersion: number;
	app: { version: string; build: string };
	exportedAt: string;
	exportedOn: string;
	idsAreLocal: true;
	notesIncluded: boolean;
	settings: ExportSettings;
	categories: {
		id: number;
		name: string;
		shape: string;
		hue: number | null;
		builtIn: boolean;
		order: number;
	}[];
	habits: {
		id: number;
		name: string;
		categoryId: number;
		category: string;
		direction: string;
		targetType: string;
		targetAmount: number | null;
		targetUnit: string | null;
		frequency: string;
		sortOrder: number;
		createdAt: string;
		updatedAt: string;
		archivedAt: string | null;
		pauses: { from: string; to: string }[];
		entries: {
			date: string;
			value: number | null;
			completed: boolean;
			createdAt: string;
		}[];
		notes?: { date: string; note: string; updatedAt: string | null }[];
		frozenDays: { date: string; createdAt: string }[];
		reminders: {
			id: number;
			time: string;
			days: string[];
			enabled: boolean;
			createdAt: string | null;
		}[];
		derived: {
			status: "active" | "archived";
			createdOn: string;
			archivedOn: string | null;
			currentStreak: number;
			longestStreak: number;
		};
	}[];
};

function buildExportDocument(
	model: ExportModel,
	app: { version: string; build: string; schemaVersion: number },
): ExportDocumentV2 {
	return {
		version: EXPORT_JSON_VERSION,
		schemaVersion: app.schemaVersion,
		app: { version: app.version, build: app.build },
		exportedAt: model.exportedAt.toISOString(),
		exportedOn: model.exportedOn,
		idsAreLocal: true,
		notesIncluded: model.notesIncluded,
		settings: model.settings,
		categories: model.categories.map((category, index) => ({
			id: category.id,
			name: category.name,
			shape: category.shape,
			hue: category.hue,
			builtIn: category.builtIn,
			order: index + 1,
		})),
		habits: model.habits.map((record) => {
			const { habit } = record;
			return {
				id: habit.id,
				name: habit.name,
				categoryId: habit.category.id,
				category: habit.category.name,
				direction: habit.direction,
				targetType: habit.targetType,
				targetAmount: habit.targetAmount,
				targetUnit: habit.targetUnit,
				frequency: describeFrequency(habit.frequency),
				sortOrder: habit.sortOrder,
				createdAt: habit.createdAt.toISOString(),
				updatedAt: habit.updatedAt.toISOString(),
				archivedAt: habit.archivedAt ? habit.archivedAt.toISOString() : null,
				pauses: habit.pauses.map(({ from, to }) => ({ from, to })),
				entries: record.logs.map((log) => ({
					date: log.date,
					value: log.value,
					completed: log.completed,
					createdAt: log.createdAt.toISOString(),
				})),
				...(model.notesIncluded
					? {
							notes: record.notes.map((note) => ({
								date: note.date,
								note: note.note,
								updatedAt: note.updatedAt ? note.updatedAt.toISOString() : null,
							})),
						}
					: {}),
				frozenDays: record.frozenDays.map((day) => ({
					date: day.date,
					createdAt: day.createdAt.toISOString(),
				})),
				reminders: record.reminders.map((reminder) => ({
					id: reminder.id,
					time: timeOfDay(reminder.hour, reminder.minute),
					days: reminder.weekdays.flatMap((day) => DAY_NAMES[day - 1] ?? []),
					enabled: reminder.enabled,
					createdAt: reminder.createdAt
						? reminder.createdAt.toISOString()
						: null,
				})),
				derived: {
					status: habit.archivedAt ? "archived" : "active",
					createdOn: dateOnly(habit.createdAt),
					archivedOn: habit.archivedAt ? dateOnly(habit.archivedAt) : null,
					currentStreak: record.currentStreak,
					longestStreak: record.longestStreak,
				},
			};
		}),
	};
}

export async function toJson(
	model: ExportModel,
	onProgress: (logsDone: number) => Promise<void> | void = () => {},
): Promise<string> {
	const document = buildExportDocument(model, getAppInfo());
	// The document is built in one go (it is small next to the file write);
	// progress still ticks per habit so the sheet's bar and Cancel keep working.
	let logsDone = 0;
	for (const record of model.habits) {
		logsDone += record.logs.length;
		await onProgress(logsDone);
	}
	return JSON.stringify(document, null, 2);
}
