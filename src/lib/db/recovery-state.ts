/**
 * The recovery flow around a database that will not open or migrate (audit
 * C-03). Pure, so the rules are tested without a screen:
 *
 * - The first failure offers Try again only.
 * - After the second consecutive failure (one retry already failed) a second
 *   action, "Set aside old data and start fresh", appears.
 * - It opens a confirm; Cancel closes it, Confirm runs the set-aside.
 * - A failed set-aside keeps the confirm open with an error and changes
 *   nothing; a successful one starts over from a clean count.
 */
export type RecoveryState = {
	/** Try again presses since the last success or set-aside. */
	retries: number;
	sheet: "closed" | "confirm" | "working" | "error";
};

export type RecoveryEvent =
	| { type: "retry" }
	| { type: "ask" }
	| { type: "cancel" }
	| { type: "confirm" }
	| { type: "done" }
	| { type: "failed" };

export const INITIAL_RECOVERY: RecoveryState = { retries: 0, sheet: "closed" };

/** Failures so far are `retries + 1`: the second one is the first retry that failed. */
export function canSetAside(state: RecoveryState): boolean {
	return state.retries >= 1;
}

export function recoveryReducer(
	state: RecoveryState,
	event: RecoveryEvent,
): RecoveryState {
	switch (event.type) {
		case "retry":
			return state.sheet === "working"
				? state
				: { ...state, retries: state.retries + 1 };
		case "ask":
			return canSetAside(state) && state.sheet === "closed"
				? { ...state, sheet: "confirm" }
				: state;
		case "cancel":
			return state.sheet === "confirm" || state.sheet === "error"
				? { ...state, sheet: "closed" }
				: state;
		case "confirm":
			return state.sheet === "confirm" || state.sheet === "error"
				? { ...state, sheet: "working" }
				: state;
		case "done":
			return state.sheet === "working" ? INITIAL_RECOVERY : state;
		case "failed":
			return state.sheet === "working" ? { ...state, sheet: "error" } : state;
	}
}
