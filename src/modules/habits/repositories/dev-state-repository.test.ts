import { count } from "drizzle-orm";
import {
	appSettings,
	categories,
	entries,
	habits,
	reminders,
} from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { buildDeviceState } from "../dev/device-state";
import { FIXTURE_SCENARIOS } from "../dev/habit-fixtures";
import type * as DevStateRepository from "./dev-state-repository";

const mockDb = createTestDb({ foreignKeys: false });
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const {
	replaceAllData,
	storedHabitIds,
}: typeof DevStateRepository = require("./dev-state-repository");

async function counts() {
	const one = async (
		table:
			| typeof habits
			| typeof entries
			| typeof reminders
			| typeof categories
			| typeof appSettings,
	) => (await mockDb.select({ n: count() }).from(table))[0].n;
	return {
		habits: await one(habits),
		entries: await one(entries),
		reminders: await one(reminders),
		categories: await one(categories),
		settings: await one(appSettings),
	};
}

describe("replaceAllData (device validation)", () => {
	it("writes a scenario with its fixture ids, then replaces it with another", async () => {
		const reminderState = buildDeviceState("?fixtures=reminders");
		await replaceAllData(reminderState);
		expect(await storedHabitIds()).toEqual(
			reminderState.habits.map((h) => h.id).sort((a, b) => a - b),
		);
		expect((await counts()).reminders).toBe(reminderState.reminders.length);

		const many = buildDeviceState("?fixtures=many-categories");
		await replaceAllData(many);
		const after = await counts();
		expect(after.reminders).toBe(0);
		expect(after.habits).toBe(many.habits.length);
		expect(after.categories).toBe(many.categories.length);
	});

	it("First Run leaves no habits and no seen flag", async () => {
		await replaceAllData(buildDeviceState("?fixtures=default"));
		await replaceAllData(buildDeviceState("?fixtures=first-run"));
		const after = await counts();
		expect(after.habits).toBe(0);
		expect(after.entries).toBe(0);
		expect(after.settings).toBe(0);
		expect(after.categories).toBe(10);
	});

	it("every scenario the registry uses can be written (foreign keys off, as on the device — some fixtures freeze days of habits a scenario does not list)", async () => {
		for (const scenario of FIXTURE_SCENARIOS) {
			const state = buildDeviceState(`?fixtures=${scenario}`);
			await replaceAllData(state);
			expect((await counts()).habits).toBe(state.habits.length);
		}
	});
});
