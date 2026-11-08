import {
	canSetAside,
	INITIAL_RECOVERY,
	type RecoveryEvent,
	type RecoveryState,
	recoveryReducer,
} from "./recovery-state";

const run = (...events: RecoveryEvent[]): RecoveryState =>
	events.reduce(recoveryReducer, INITIAL_RECOVERY);

describe("recovery state machine", () => {
	it("the first failure offers no set-aside", () => {
		expect(canSetAside(INITIAL_RECOVERY)).toBe(false);
		expect(run({ type: "ask" })).toEqual(INITIAL_RECOVERY);
	});

	it("the second consecutive failure (a failed retry) offers it", () => {
		const state = run({ type: "retry" });
		expect(canSetAside(state)).toBe(true);
		expect(run({ type: "retry" }, { type: "ask" }).sheet).toBe("confirm");
	});

	it("cancel closes the confirm and changes nothing else", () => {
		const state = run({ type: "retry" }, { type: "ask" }, { type: "cancel" });
		expect(state).toEqual({ retries: 1, sheet: "closed" });
	});

	it("confirm starts the work, and nothing interrupts it", () => {
		const working = run(
			{ type: "retry" },
			{ type: "ask" },
			{ type: "confirm" },
		);
		expect(working.sheet).toBe("working");
		expect(recoveryReducer(working, { type: "cancel" })).toBe(working);
		expect(recoveryReducer(working, { type: "retry" })).toBe(working);
		expect(recoveryReducer(working, { type: "ask" })).toBe(working);
	});

	it("a successful set-aside starts over from a clean count", () => {
		expect(
			run(
				{ type: "retry" },
				{ type: "ask" },
				{ type: "confirm" },
				{ type: "done" },
			),
		).toEqual(INITIAL_RECOVERY);
	});

	it("a failed set-aside keeps the confirm open with an error, and can be retried or cancelled", () => {
		const failed = run(
			{ type: "retry" },
			{ type: "ask" },
			{ type: "confirm" },
			{ type: "failed" },
		);
		expect(failed).toEqual({ retries: 1, sheet: "error" });
		expect(recoveryReducer(failed, { type: "confirm" }).sheet).toBe("working");
		expect(recoveryReducer(failed, { type: "cancel" }).sheet).toBe("closed");
	});

	it("ignores events that do not fit the state", () => {
		expect(run({ type: "confirm" })).toEqual(INITIAL_RECOVERY);
		expect(run({ type: "done" })).toEqual(INITIAL_RECOVERY);
		expect(run({ type: "failed" })).toEqual(INITIAL_RECOVERY);
		expect(run({ type: "cancel" })).toEqual(INITIAL_RECOVERY);
	});
});
