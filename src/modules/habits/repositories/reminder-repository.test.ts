import { habits, reminders } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as ReminderRepository from "./reminder-repository";

const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const {
	getHabitReminders,
	createReminder,
	updateReminder,
	deleteReminder,
}: typeof ReminderRepository = require("./reminder-repository");

async function seedHabit(): Promise<number> {
	const now = new Date();
	const [row] = await mockDb
		.insert(habits)
		.values({ ...makeHabitInput(), createdAt: now, updatedAt: now })
		.returning();
	return row.id;
}

describe("reminder-repository", () => {
	beforeEach(async () => {
		await mockDb.delete(reminders);
		await mockDb.delete(habits);
	});

	it("creates a reminder and maps it back to domain weekdays, sorted and de-duplicated", async () => {
		const habitId = await seedHabit();
		const created = await createReminder({
			habitId,
			hour: 7,
			minute: 20,
			weekdays: [5, 1, 3, 1],
			enabled: true,
		});

		expect(created).toEqual({
			id: expect.any(Number),
			habitId,
			hour: 7,
			minute: 20,
			weekdays: [1, 3, 5],
			enabled: true,
		});
		const [row] = await mockDb.select().from(reminders);
		expect(row.weekdays).toBe("1,3,5");
	});

	it("lists one habit's reminders earliest-first, not other habits'", async () => {
		const habitA = await seedHabit();
		const habitB = await seedHabit();
		const at = (habitId: number, hour: number, minute: number) =>
			createReminder({ habitId, hour, minute, weekdays: [1], enabled: true });
		await at(habitA, 21, 0);
		await at(habitA, 7, 20);
		await at(habitB, 8, 0);

		const list = await getHabitReminders(habitA);
		expect(list.map((r) => `${r.hour}:${r.minute}`)).toEqual(["7:20", "21:0"]);
	});

	it("updates only the patched fields", async () => {
		const habitId = await seedHabit();
		const created = await createReminder({
			habitId,
			hour: 7,
			minute: 20,
			weekdays: [1, 2],
			enabled: true,
		});

		const toggled = await updateReminder(created.id, { enabled: false });
		expect(toggled).toEqual({ ...created, enabled: false });

		const moved = await updateReminder(created.id, { weekdays: [7, 6] });
		expect(moved.weekdays).toEqual([6, 7]);
		expect(moved.hour).toBe(7);
	});

	it("deletes a reminder", async () => {
		const habitId = await seedHabit();
		const created = await createReminder({
			habitId,
			hour: 7,
			minute: 0,
			weekdays: [1],
			enabled: true,
		});

		await deleteReminder(created.id);
		expect(await getHabitReminders(habitId)).toEqual([]);
	});
});
