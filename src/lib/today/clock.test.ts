import { systemClock } from "./clock";

describe("systemClock", () => {
	beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 9, 23, 12) }));
	afterEach(() => jest.useRealTimers());

	it("reads the real time", () => {
		expect(systemClock.now().getHours()).toBe(12);
	});

	it("runs once after the delay", () => {
		const run = jest.fn();
		systemClock.after(1000, run);
		jest.advanceTimersByTime(999);
		expect(run).not.toHaveBeenCalled();
		jest.advanceTimersByTime(1);
		expect(run).toHaveBeenCalledTimes(1);
	});

	it("does not run once cancelled", () => {
		const run = jest.fn();
		const cancel = systemClock.after(1000, run);
		cancel();
		jest.advanceTimersByTime(2000);
		expect(run).not.toHaveBeenCalled();
	});
});
