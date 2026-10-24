import {
	defaultDurationMs,
	type MessageSpec,
	messages,
	messageText,
	UNDO_DURATION_MS,
} from "./messages";

describe("message catalogue", () => {
	it("starts empty — strings move in with the V3 screens", () => {
		expect(Object.keys(messages)).toEqual([]);
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
			expect(UNDO_DURATION_MS).toBe(5000);
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
