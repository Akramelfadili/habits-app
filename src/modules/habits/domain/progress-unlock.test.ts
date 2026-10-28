import { progressGate, progressUnlock } from "./progress-unlock";

describe("progressUnlock", () => {
	it("counts toward 7 logged days with the days remaining and a progress fraction", () => {
		const unlock = progressUnlock({ count: 3, firstDate: "2026-10-21" });
		expect(unlock).toMatchObject({
			loggedDays: 3,
			neededDays: 7,
			remainingDays: 4,
			isUnlocked: false,
		});
		expect(unlock.progress).toBeCloseTo(3 / 7);
		expect(unlock.firstLogDate?.getDate()).toBe(21);
	});

	it("unlocks on the seventh logged day, capping the display at 7", () => {
		expect(
			progressUnlock({ count: 6, firstDate: "2026-10-01" }).isUnlocked,
		).toBe(false);
		expect(progressUnlock({ count: 7, firstDate: "2026-10-01" })).toMatchObject(
			{
				isUnlocked: true,
				remainingDays: 0,
				progress: 1,
			},
		);
		expect(
			progressUnlock({ count: 400, firstDate: "2025-01-01" }),
		).toMatchObject({
			loggedDays: 7,
			isUnlocked: true,
		});
	});

	it("has no first day when nothing was logged", () => {
		expect(progressUnlock({ count: 0, firstDate: null })).toMatchObject({
			loggedDays: 0,
			remainingDays: 7,
			firstLogDate: null,
		});
	});
});

describe("progressGate", () => {
	const unlocked = progressUnlock({ count: 9, firstDate: "2026-10-01" });
	const early = progressUnlock({ count: 3, firstDate: "2026-10-21" });
	const none = progressUnlock({ count: 0, firstDate: null });

	it("is no-habits before anything else", () => {
		expect(progressGate(0, none)).toBe("no-habits");
		expect(progressGate(0, unlocked)).toBe("no-habits");
	});

	it("is nothing-logged when habits exist but nothing was ever logged", () => {
		expect(progressGate(2, none)).toBe("nothing-logged");
	});

	it("is too-early below 7 logged days and ready from 7", () => {
		expect(progressGate(2, early)).toBe("too-early");
		expect(progressGate(2, unlocked)).toBe("ready");
	});
});
