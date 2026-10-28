import { useToastStore } from "@/store/toast-store";
import {
	defaultDurationMs,
	type MessageSpec,
	messages,
	messageText,
	showMessage,
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
			expect(defaultDurationMs({ tone: "info" })).toBe(4000);
			expect(defaultDurationMs({ tone: "success" })).toBe(4000);
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
