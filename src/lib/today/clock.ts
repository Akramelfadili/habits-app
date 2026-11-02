/**
 * What "now" and "later" are, so the rollover can be tested without waiting for
 * midnight: tests hand in a clock they move by hand; the app uses the system's.
 */
export type Clock = {
	now: () => Date;
	/** Runs `run` once after `ms`; returns the cancel. */
	after: (ms: number, run: () => void) => () => void;
};

export const systemClock: Clock = {
	now: () => new Date(),
	after: (ms, run) => {
		const timer = setTimeout(run, ms);
		return () => clearTimeout(timer);
	},
};
