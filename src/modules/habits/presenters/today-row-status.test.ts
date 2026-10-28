import { makeHabit } from "../test-support/habit-builder";
import { todayRowStatus } from "./today-row-status";

const base = {
	completed: false,
	quantityValue: 0,
	completedThisWeek: 0,
	streak: undefined,
	atRisk: undefined,
	frozenYesterday: undefined,
	isToday: true,
};

describe("todayRowStatus", () => {
	it("shows the streak alone for a check habit, with no completion time", () => {
		const status = todayRowStatus({
			...base,
			habit: makeHabit({ name: "Meditate" }),
			completed: true,
			streak: 13,
		});
		expect(status).toEqual({ text: "13-day streak", tone: "default" });
	});

	it("shows nothing for a check habit with no streak yet", () => {
		expect(
			todayRowStatus({ ...base, habit: makeHabit({ name: "Meditate" }) }),
		).toBeUndefined();
	});

	it("counts a quantity habit against its target, past it too", () => {
		const habit = makeHabit({
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
		});
		expect(todayRowStatus({ ...base, habit, quantityValue: 5 })?.text).toBe(
			"5 of 8 glasses",
		);
		expect(todayRowStatus({ ...base, habit, quantityValue: 9 })?.text).toBe(
			"9 of 8 glasses",
		);
	});

	it("shows a per-week habit's standing", () => {
		const habit = makeHabit({
			frequency: { type: "per-week", timesPerWeek: 3 },
		});
		expect(todayRowStatus({ ...base, habit, completedThisWeek: 1 })?.text).toBe(
			"3× per week · 1 done",
		);
	});

	it("uses resisting / resisted copy for a Break habit, never failed", () => {
		const habit = makeHabit({ direction: "break" });
		expect(todayRowStatus({ ...base, habit, streak: 4 })?.text).toBe(
			"Resisting · 4 days strong",
		);
		expect(
			todayRowStatus({ ...base, habit, completed: true, streak: 5 })?.text,
		).toBe("Resisted today · 5 days strong");
		expect(
			todayRowStatus({
				...base,
				habit,
				completed: true,
				streak: 1,
				isToday: false,
			})?.text,
		).toBe("Resisted · 1 day strong");
		expect(todayRowStatus({ ...base, habit })?.text).toBe("Resisting");
	});

	it("warns in amber when the streak is at risk, naming the day and the freezes left", () => {
		const status = todayRowStatus({
			...base,
			habit: makeHabit({}),
			atRisk: {
				missedDate: new Date(2026, 9, 22),
				freezesRemaining: 1,
			},
		});
		expect(status).toEqual({
			text: "Missed Thursday · 1 freeze left",
			tone: "warning",
		});
	});

	it("says so plainly when no freeze is left", () => {
		const status = todayRowStatus({
			...base,
			habit: makeHabit({}),
			atRisk: {
				missedDate: new Date(2026, 9, 22),
				freezesRemaining: 0,
			},
		});
		expect(status?.text).toBe("Missed Thursday · no freezes left");
	});

	it("reads a covered day in violet", () => {
		const status = todayRowStatus({
			...base,
			habit: makeHabit({}),
			frozenYesterday: { date: new Date(2026, 9, 22), streak: 13 },
		});
		expect(status).toEqual({
			text: "Thu frozen · streak kept at 13",
			tone: "frozen",
		});
	});

	it("lets at risk win over a quantity amount", () => {
		const status = todayRowStatus({
			...base,
			habit: makeHabit({
				targetType: "quantity",
				targetAmount: 8,
				targetUnit: "glasses",
			}),
			atRisk: {
				missedDate: new Date(2026, 9, 22),
				freezesRemaining: 2,
			},
		});
		expect(status?.tone).toBe("warning");
	});

	it("drops the at-risk line once the habit is done today", () => {
		const status = todayRowStatus({
			...base,
			habit: makeHabit({}),
			completed: true,
			streak: 14,
			atRisk: { missedDate: new Date(2026, 9, 22), freezesRemaining: 1 },
		});
		expect(status).toEqual({ text: "14-day streak", tone: "default" });
	});

	it("reads 'Resist tonight' for an open Break habit in the evening, today only", () => {
		const habit = makeHabit({ direction: "break" });
		expect(
			todayRowStatus({ ...base, habit, streak: 9, isEvening: true })?.text,
		).toBe("Resist tonight · 9-day streak");
		expect(todayRowStatus({ ...base, habit, isEvening: true })?.text).toBe(
			"Resist tonight",
		);
		// Resisted already, a past day, or the daytime: unchanged.
		expect(
			todayRowStatus({
				...base,
				habit,
				completed: true,
				streak: 5,
				isEvening: true,
			})?.text,
		).toBe("Resisted today · 5 days strong");
		expect(
			todayRowStatus({ ...base, habit, isToday: false, isEvening: true })?.text,
		).toBe("Resisting");
		expect(todayRowStatus({ ...base, habit, streak: 4 })?.text).toBe(
			"Resisting · 4 days strong",
		);
	});
});
