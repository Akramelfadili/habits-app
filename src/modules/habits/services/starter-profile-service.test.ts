import { count, eq, sql } from "drizzle-orm";
import {
	appSettings,
	entries,
	entryNotes,
	frozenDays,
	habits,
	reminders,
} from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { log } from "@/lib/logger/logger";
import type * as StarterProfileService from "./starter-profile-service";

// Foreign keys ON: the wipe must delete children before habits.
const mockDb = createTestDb({ foreignKeys: true });
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));
const mockSyncAfterWrite = jest.fn().mockResolvedValue(undefined);
const mockCancel = jest.fn().mockResolvedValue(undefined);
const callOrder: string[] = [];
jest.doMock("./reminder-service", () => ({
	syncAfterWrite: mockSyncAfterWrite,
	cancelHabitNotifications: mockCancel,
}));

const {
	applyStarterProfile,
}: typeof StarterProfileService = require("./starter-profile-service");

// The seeded old data has history and no marker, so tests that replace it opt in.
const profileJson = (version: number, names: string[], replace = true) =>
	JSON.stringify({
		version,
		replace,
		habits: names.map((name) => ({ name, category: "Health" })),
	});

async function habitNames(): Promise<string[]> {
	const rows = await mockDb.select().from(habits).orderBy(habits.sortOrder);
	return rows.map((row) => row.name);
}

async function setting(key: string): Promise<string | undefined> {
	const [row] = await mockDb
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, key));
	return row?.value;
}

async function seedOldData() {
	const now = new Date();
	await mockDb.delete(entries);
	await mockDb.delete(entryNotes);
	await mockDb.delete(frozenDays);
	await mockDb.delete(reminders);
	await mockDb.delete(habits);
	await mockDb.delete(appSettings);
	await mockDb.insert(appSettings).values([
		{ key: "app.themePreference", value: "dark" },
		{ key: "habits.eveningReview", value: "true" },
	]);
	const [old] = await mockDb
		.insert(habits)
		.values({
			name: "Old habit",
			categoryId: 1,
			direction: "build",
			targetType: "simple",
			frequencyType: "daily",
			sortOrder: 1,
			createdAt: now,
			updatedAt: now,
		})
		.returning();
	await mockDb
		.insert(entries)
		.values({ habitId: old.id, date: "2026-01-01", createdAt: now });
	await mockDb
		.insert(entryNotes)
		.values({ habitId: old.id, date: "2026-01-01", note: "n", updatedAt: now });
	await mockDb
		.insert(frozenDays)
		.values({ habitId: old.id, date: "2026-01-02", createdAt: now });
	await mockDb.insert(reminders).values({
		habitId: old.id,
		hour: 9,
		minute: 0,
		weekdays: "1,2",
		enabled: true,
		createdAt: now,
	});
}

async function rowCount(table: typeof entries | typeof reminders) {
	return (await mockDb.select({ n: count() }).from(table))[0].n;
}

describe("applyStarterProfile", () => {
	beforeEach(async () => {
		jest.restoreAllMocks();
		mockSyncAfterWrite.mockClear();
		mockCancel.mockClear();
		callOrder.length = 0;
		mockCancel.mockImplementation(async () => {
			callOrder.push("cancel");
		});
		mockSyncAfterWrite.mockImplementation(async () => {
			callOrder.push("sync");
		});
		await seedOldData();
	});

	it("first apply replaces the old data, keeps settings and marks First Run done", async () => {
		const result = await applyStarterProfile(profileJson(1, ["Alpha", "Beta"]));

		expect(result).toBe("applied");
		expect(await habitNames()).toEqual(["Alpha", "Beta"]);
		expect(await rowCount(entries)).toBe(0);
		expect(await rowCount(reminders)).toBe(0);
		expect(await setting("app.themePreference")).toBe("dark");
		expect(await setting("habits.eveningReview")).toBe("true");
		expect(await setting("habits.seenFirstRun")).not.toBeUndefined();
		expect(await setting("dev.starterProfile")).toBe("1");
		expect(mockSyncAfterWrite).not.toHaveBeenCalled();
	});

	it("creates habits through the app's rules: quantity, per-week, order, category", async () => {
		await applyStarterProfile(
			JSON.stringify({
				version: 1,
				replace: true,
				habits: [
					{
						name: "Alpha",
						category: "Fitness",
						target: { amount: 20, unit: "min" },
					},
					{ name: "Beta", category: "Other", perWeek: 3 },
				],
			}),
		);
		const rows = await mockDb.select().from(habits).orderBy(habits.sortOrder);
		expect(rows[0]).toMatchObject({
			targetType: "quantity",
			targetAmount: 20,
			targetUnit: "min",
			frequencyType: "daily",
		});
		expect(rows[1]).toMatchObject({
			targetType: "simple",
			frequencyType: "per-week",
			frequencyTimesPerWeek: 3,
		});
		expect(rows[0].sortOrder).toBeLessThan(rows[1].sortOrder);
		expect(rows[0].categoryId).not.toBe(rows[1].categoryId);
	});

	it("does nothing when the stored version matches, so later changes persist", async () => {
		await applyStarterProfile(profileJson(1, ["Alpha"]));
		await mockDb.update(habits).set({ name: "Renamed in the app" });

		const result = await applyStarterProfile(profileJson(1, ["Alpha", "Beta"]));

		expect(result).toBe("unchanged");
		expect(await habitNames()).toEqual(["Renamed in the app"]);
	});

	it("re-applies when the version is higher", async () => {
		await applyStarterProfile(profileJson(1, ["Alpha"]));
		const result = await applyStarterProfile(
			profileJson(2, ["Gamma", "Delta"]),
		);

		expect(result).toBe("applied");
		expect(await habitNames()).toEqual(["Gamma", "Delta"]);
		expect(await setting("dev.starterProfile")).toBe("2");
	});

	it.each([
		["not JSON", "{nope"],
		["wrong shape", JSON.stringify({ version: 1, habits: [] })],
		[
			"unknown category",
			JSON.stringify({
				version: 1,
				habits: [{ name: "A", category: "Nope" }],
			}),
		],
		[
			"duplicate names",
			JSON.stringify({
				version: 1,
				habits: [
					{ name: "A", category: "Health" },
					{ name: "a", category: "Health" },
				],
			}),
		],
	])(
		"an invalid profile (%s) warns and changes nothing",
		async (_label, raw) => {
			const warn = jest.spyOn(log, "warn").mockImplementation(() => undefined);

			expect(await applyStarterProfile(raw)).toBe("invalid");

			expect(await habitNames()).toEqual(["Old habit"]);
			expect(await rowCount(entries)).toBe(1);
			expect(await setting("dev.starterProfile")).toBeUndefined();
			expect(warn).toHaveBeenCalledWith("dev.starter_profile.invalid", {
				reason: expect.stringMatching(/^invalid_(json|shape)$/),
			});
		},
	);

	it("an absent or empty variable changes nothing", async () => {
		expect(await applyStarterProfile(undefined)).toBe("absent");
		expect(await applyStarterProfile("  ")).toBe("absent");
		expect(await habitNames()).toEqual(["Old habit"]);
	});

	it("a failure rolls back and keeps the old data and marker", async () => {
		const brokenSecond = JSON.stringify({
			version: 1,
			replace: true,
			habits: [
				{ name: "Alpha", category: "Health" },
				{
					name: "Beta",
					category: "Health",
					reminders: [{ hour: 9, minute: 0 }],
				},
			],
		});
		await mockDb.run(
			sql`create trigger fail_reminder before insert on reminders begin select raise(abort, 'boom'); end`,
		);
		jest.spyOn(log, "error").mockImplementation(() => undefined);

		const result = await applyStarterProfile(brokenSecond);
		await mockDb.run(sql`drop trigger fail_reminder`);

		expect(result).toBe("failed");
		expect(await habitNames()).toEqual(["Old habit"]);
		expect(await rowCount(entries)).toBe(1);
		expect(await rowCount(reminders)).toBe(1);
		expect(await setting("dev.starterProfile")).toBeUndefined();
		expect(await setting("app.themePreference")).toBe("dark");
	});

	it("schedules only habits that have a reminder, and logs counts without names", async () => {
		const info = jest.spyOn(log, "info").mockImplementation(() => undefined);

		await applyStarterProfile(
			JSON.stringify({
				version: 1,
				replace: true,
				habits: [
					{ name: "Alpha", category: "Health" },
					{
						name: "Beta",
						category: "Health",
						reminders: [{ hour: 8, minute: 30, weekdays: [1, 3] }],
					},
				],
			}),
		);

		expect(mockSyncAfterWrite).toHaveBeenCalledTimes(1);
		expect(mockSyncAfterWrite.mock.calls[0][0]).toMatchObject({ name: "Beta" });
		expect(await rowCount(reminders)).toBe(1);
		expect(info).toHaveBeenCalledWith("dev.starter_profile.applied", {
			version: 1,
			count: 2,
			withReminders: 1,
		});
	});

	describe("guard for a database that already has history", () => {
		it("refuses without a marker or replace, logs counts only, changes nothing", async () => {
			const warn = jest.spyOn(log, "warn").mockImplementation(() => undefined);

			const result = await applyStarterProfile(
				profileJson(1, ["Alpha"], false),
			);

			expect(result).toBe("refused");
			expect(await habitNames()).toEqual(["Old habit"]);
			expect(await rowCount(entries)).toBe(1);
			expect(await setting("dev.starterProfile")).toBeUndefined();
			expect(warn).toHaveBeenCalledWith("dev.starter_profile.refused", {
				entries: 1,
				notes: 1,
				frozenDays: 1,
			});
			expect(mockCancel).not.toHaveBeenCalled();
		});

		it("refuses when only a note or a frozen day exists", async () => {
			jest.spyOn(log, "warn").mockImplementation(() => undefined);
			await mockDb.delete(entries);
			await mockDb.delete(entryNotes);
			expect(await applyStarterProfile(profileJson(1, ["A"], false))).toBe(
				"refused",
			);
		});

		it("applies on a database with habits but no history", async () => {
			await mockDb.delete(entries);
			await mockDb.delete(entryNotes);
			await mockDb.delete(frozenDays);
			expect(await applyStarterProfile(profileJson(1, ["Alpha"], false))).toBe(
				"applied",
			);
			expect(await habitNames()).toEqual(["Alpha"]);
		});

		it("applies on an empty database", async () => {
			await mockDb.delete(entries);
			await mockDb.delete(entryNotes);
			await mockDb.delete(frozenDays);
			await mockDb.delete(reminders);
			await mockDb.delete(habits);
			expect(await applyStarterProfile(profileJson(1, ["Alpha"], false))).toBe(
				"applied",
			);
		});

		it("a bumped version (marker present) still re-applies without replace", async () => {
			await applyStarterProfile(profileJson(1, ["Alpha"]));
			await mockDb.insert(entries).values({
				habitId: (await mockDb.select().from(habits))[0].id,
				date: "2026-02-01",
				createdAt: new Date(),
			});
			expect(await applyStarterProfile(profileJson(2, ["Beta"], false))).toBe(
				"applied",
			);
			expect(await habitNames()).toEqual(["Beta"]);
		});
	});

	it("cancels the deleted habits' notifications before syncing the new ones", async () => {
		const oldIds = (await mockDb.select().from(habits)).map((row) => row.id);
		await applyStarterProfile(
			JSON.stringify({
				version: 1,
				replace: true,
				habits: [
					{
						name: "Beta",
						category: "Health",
						reminders: [{ hour: 8, minute: 0 }],
					},
				],
			}),
		);

		expect(mockCancel.mock.calls.map((call) => call[0])).toEqual(oldIds);
		expect(callOrder).toEqual(["cancel", "sync"]);
	});

	it("does not stop applying when a cancel fails", async () => {
		jest.spyOn(log, "error").mockImplementation(() => undefined);
		mockCancel.mockRejectedValueOnce(new Error("no permission"));
		expect(await applyStarterProfile(profileJson(1, ["Alpha"]))).toBe(
			"applied",
		);
	});
});
