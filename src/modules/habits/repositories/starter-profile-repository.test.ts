import { eq } from "drizzle-orm";
import { appSettings, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import type * as StarterProfileRepository from "./starter-profile-repository";

const mockDb = createTestDb({ foreignKeys: true });
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));

const {
	replaceHabitsWithStarterProfile,
}: typeof StarterProfileRepository = require("./starter-profile-repository");

describe("replaceHabitsWithStarterProfile", () => {
	it("creates the habits in order, flags the ones with reminders, and writes both settings", async () => {
		const applied = await replaceHabitsWithStarterProfile({
			version: 3,
			habits: [
				{ name: "Alpha", category: "Health" },
				{
					name: "Beta",
					category: "Learning",
					reminders: [{ hour: 7, minute: 15 }],
				},
			],
		});

		expect(applied.map((entry) => entry.habit.name)).toEqual(["Alpha", "Beta"]);
		expect(applied.map((entry) => entry.hasReminders)).toEqual([false, true]);
		expect(applied[1].habit.category.name).toBe("Learning");
		expect(await mockDb.select().from(habits)).toHaveLength(2);
		const [marker] = await mockDb
			.select()
			.from(appSettings)
			.where(eq(appSettings.key, "dev.starterProfile"));
		expect(marker.value).toBe("3");
	});

	it("throws, and writes nothing, for a category that does not exist", async () => {
		await expect(
			replaceHabitsWithStarterProfile({
				version: 4,
				habits: [{ name: "Gamma", category: "Nope" }],
			}),
		).rejects.toThrow();

		const names = (await mockDb.select().from(habits)).map((row) => row.name);
		expect(names).not.toContain("Gamma");
		const marker = await mockDb
			.select()
			.from(appSettings)
			.where(eq(appSettings.key, "dev.starterProfile"));
		expect(marker[0]?.value).toBe("3");
	});
});
