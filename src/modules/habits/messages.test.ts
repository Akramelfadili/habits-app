import { useToastStore } from "@/store/toast-store";
import {
	defaultDurationMs,
	type MessageSpec,
	messages,
	messageText,
	progressCopy,
	showMessage,
	todayCopy,
} from "./messages";

describe("message catalogue", () => {
	describe("Today's toasts", () => {
		it("name the habit, and the day only when it isn't today", () => {
			expect(messageText(messages.completed, "Read")).toBe(
				"Marked 'Read' complete",
			);
			expect(messageText(messages.completed, "Read", "Wed 21 Oct")).toBe(
				"Marked 'Read' complete · Wed 21 Oct",
			);
			expect(messageText(messages.resisted, "Vaping")).toBe(
				"Resisted 'Vaping'",
			);
			expect(messageText(messages.notResisted, "Vaping", "Wed 21 Oct")).toBe(
				"Marked 'Vaping' not resisted · Wed 21 Oct",
			);
		});

		it("word +1 with the count, the target and the unit (D6)", () => {
			expect(
				messageText(messages.quantityAdded, "Drink water", 3, 8, "glasses"),
			).toBe("Drink water +1 · 3 of 8 glasses");
			expect(
				messageText(messages.quantityAdded, "Drink water", 9, 8, "glasses"),
			).toBe("Drink water +1 · 9 of 8 glasses");
			expect(
				messageText(
					messages.quantityAdded,
					"Drink water",
					3,
					8,
					"glasses",
					"Wed 21 Oct",
				),
			).toBe("Drink water +1 · 3 of 8 glasses · Wed 21 Oct");
			expect(messageText(messages.quantityAdded, "Pushups", 2, 20, null)).toBe(
				"Pushups +1 · 2 of 20",
			);
		});
	});

	it("showMessage puts the catalogue's copy in the toast, with Undo only when given one", () => {
		const undo = jest.fn();
		showMessage(messages.offSchedule, ["Walk"], undo);
		const { toast } = useToastStore.getState();
		expect(toast?.message).toBe("Logged 'Walk' · off-schedule");
		expect(toast?.actionLabel).toBe("Undo");
		toast?.onAction?.();
		expect(undo).toHaveBeenCalledTimes(1);

		showMessage(messages.offSchedule, ["Walk"]);
		expect(useToastStore.getState().toast?.actionLabel).toBeUndefined();
	});

	it("fills a message's params", () => {
		const freezeUsed: MessageSpec<[string, number]> = {
			tone: "success",
			text: (day, left) => `Freeze used for ${day} · ${left} left`,
		};
		expect(messageText(freezeUsed, "Thu 22", 0)).toBe(
			"Freeze used for Thu 22 · 0 left",
		);
		expect(messageText({ tone: "info", text: "Export ready" })).toBe(
			"Export ready",
		);
	});

	describe("defaultDurationMs (HAB-48 timings)", () => {
		it("gives each tone its default", () => {
			expect(defaultDurationMs({ tone: "info" })).toBe(3000);
			expect(defaultDurationMs({ tone: "success" })).toBe(3000);
			expect(defaultDurationMs({ tone: "warning" })).toBe(6000);
			expect(defaultDurationMs({ tone: "error" })).toBeNull();
		});

		it("gives a toast with Undo the 5 s Undo window", () => {
			expect(defaultDurationMs({ tone: "success" }, { hasUndo: true })).toBe(
				5000,
			);
		});

		it("lets a message override its tone's default, including 'until dismissed'", () => {
			expect(defaultDurationMs({ tone: "info", durationMs: 8000 })).toBe(8000);
			expect(
				defaultDurationMs({ tone: "warning", durationMs: null }),
			).toBeNull();
		});
	});
});

describe("todayCopy (inline Today copy)", () => {
	it("pluralises days and freezes", () => {
		expect(todayCopy.rowResisting(1)).toBe("Resisting · 1 day strong");
		expect(todayCopy.rowResisting(4)).toBe("Resisting · 4 days strong");
		expect(todayCopy.rowAtRisk("Thursday", 1)).toBe(
			"Missed Thursday · 1 freeze left",
		);
		expect(todayCopy.rowAtRisk("Thursday", 2)).toBe(
			"Missed Thursday · 2 freezes left",
		);
	});

	it("says resisting, resisted and strong — never failed (D8)", () => {
		const all = [
			todayCopy.rowResisting(3),
			todayCopy.rowResisted(3, true),
			todayCopy.rowResisted(3, false),
			todayCopy.circleNotResisted("No social media"),
			todayCopy.circleResisted("No social media"),
		].join(" ");
		expect(all).not.toMatch(/fail|miss|break/i);
	});

	it("never carries a completion time into a status line", () => {
		const lines = [
			todayCopy.rowStreak(13),
			todayCopy.rowPerWeek(3, 1),
			todayCopy.rowAmount(5, 8, "glasses"),
			todayCopy.bonusSchedule("Mon–Fri"),
		];
		for (const line of lines) expect(line).not.toMatch(/\d\d:\d\d/);
	});

	it("counts groups and progress as 'x of y'", () => {
		expect(todayCopy.groupCount(0, 2)).toBe("0 of 2");
		expect(todayCopy.progressLabel(1, 5)).toBe("1 of 5 done");
	});
});

describe("Progress copy (HAB-35–38)", () => {
	it("explains why Export cannot run, as an info toast that holds 3 s", () => {
		expect(messageText(messages.exportNothing)).toBe(
			"Nothing to export yet. Log a habit on Today first, then come back.",
		);
		expect(messages.exportNothing.tone).toBe("info");
		expect(defaultDurationMs(messages.exportNothing)).toBe(3000);
	});

	it("counts down the unlock in days, singular at one", () => {
		expect(progressCopy.unlock.weekTitle(4)).toBe("Insights unlock in 4 days");
		expect(progressCopy.unlock.weekTitle(1)).toBe("Insights unlock in 1 day");
		expect(progressCopy.unlock.monthTitle(4)).toBe(
			"Month summary unlocks in 4 days",
		);
		expect(progressCopy.unlock.yearTitle(2)).toBe(
			"Year view unlocks in 2 days",
		);
		expect(progressCopy.unlock.progress(3, 7)).toBe("3 of 7 days");
	});

	it("says freezes left in the singular too", () => {
		expect(progressCopy.legend.freezesLeft(1)).toBe("1 freeze left");
		expect(progressCopy.legend.freezesLeft(0)).toBe("0 freezes left");
		expect(progressCopy.stats.freezesLeft(2)).toBe("2 freezes left");
	});

	it("writes a change in whole points with a real minus sign", () => {
		expect(progressCopy.stats.delta(6, "Sep")).toBe("+6 pts vs Sep");
		expect(progressCopy.stats.delta(-4, "Sep")).toBe("−4 pts vs Sep");
		expect(progressCopy.stats.delta(0, "Sep")).toBe("±0 pts vs Sep");
	});

	it("reads a cell as its day and state, partial always with its percentage", () => {
		expect(progressCopy.cell.partial(60)).toBe("partial 60 percent");
		expect(progressCopy.cell.percent(80)).toBe("80 percent");
	});

	it("uses resisted and slipped for Break habits, never failed (D8)", () => {
		const words = [
			progressCopy.cell.resisted,
			progressCopy.cell.slipped,
			progressCopy.day.state.resisted,
			progressCopy.day.state.slipped,
			progressCopy.month.resisted(20, 23),
		].join(" ");
		expect(words).not.toMatch(/fail/i);
	});

	it("never says 'Success' or 'Oops' (D12)", () => {
		expect(JSON.stringify(progressCopy)).not.toMatch(/success!|oops/i);
	});
});
