import { act, renderHook } from "@testing-library/react-native";
import { format } from "date-fns";
import { AppState } from "react-native";
import { currentDay, useToday } from "./use-today";

const day = (date: Date) => format(date, "yyyy-MM-dd");

let appStateListener: ((state: string) => void) | undefined;

beforeEach(() => {
	appStateListener = undefined;
	jest
		.spyOn(AppState, "addEventListener")
		.mockImplementation((_type, listener) => {
			appStateListener = listener as (state: string) => void;
			return { remove: () => (appStateListener = undefined) };
		});
	jest.useFakeTimers({ now: new Date(2026, 9, 7, 23, 59, 0) });
});

afterEach(() => {
	jest.useRealTimers();
	jest.restoreAllMocks();
});

describe("useToday", () => {
	it("is local midnight today", async () => {
		const { result } = await renderHook(() => useToday());
		expect(day(result.current)).toBe("2026-10-07");
		expect(result.current.getHours()).toBe(0);
	});

	it("is the same object across renders within a day", async () => {
		const { result, rerender } = await renderHook(() => useToday());
		const first = result.current;
		await rerender({});
		expect(result.current).toBe(first);
	});

	it("moves to the next day at midnight while the app stays open", async () => {
		const { result } = await renderHook(() => useToday());

		await act(() => jest.advanceTimersByTime(61 * 1000));

		expect(day(result.current)).toBe("2026-10-08");
	});

	it("re-arms for the following midnight", async () => {
		const { result } = await renderHook(() => useToday());
		await act(() => jest.advanceTimersByTime(61 * 1000));
		await act(() => jest.advanceTimersByTime(24 * 60 * 60 * 1000));
		expect(day(result.current)).toBe("2026-10-09");
	});

	it("updates when the app returns to the foreground on a later day", async () => {
		const { result } = await renderHook(() => useToday());

		// Backgrounded overnight: timers did not run, the clock moved on.
		jest.setSystemTime(new Date(2026, 9, 8, 7, 30, 0));
		await act(() => appStateListener?.("active"));

		expect(day(result.current)).toBe("2026-10-08");
	});

	it("ignores a change to background", async () => {
		const { result } = await renderHook(() => useToday());
		jest.setSystemTime(new Date(2026, 9, 8, 7, 30, 0));
		await act(() => appStateListener?.("background"));
		expect(day(result.current)).toBe("2026-10-07");
	});

	it("cleans up its timer and listener", async () => {
		const { unmount } = await renderHook(() => useToday());
		const clear = jest.spyOn(globalThis, "clearTimeout");
		await unmount();
		expect(appStateListener).toBeUndefined();
		expect(clear).toHaveBeenCalled();
	});
});

describe("currentDay", () => {
	it("reads the clock at call time", () => {
		expect(day(currentDay())).toBe("2026-10-07");
		jest.setSystemTime(new Date(2026, 9, 8, 0, 1, 0));
		expect(day(currentDay())).toBe("2026-10-08");
	});
});

describe("useToday with an injected clock (no timers)", () => {
	/** A clock moved by hand: `advance` moves "now" and runs what was due. */
	function handClock(start: Date) {
		let current = start;
		const pending: { at: number; run: () => void }[] = [];
		return {
			clock: {
				now: () => current,
				after: (ms: number, run: () => void) => {
					const entry = { at: current.getTime() + ms, run };
					pending.push(entry);
					return () => {
						pending.splice(pending.indexOf(entry), 1);
					};
				},
			},
			advance(ms: number) {
				current = new Date(current.getTime() + ms);
				for (const entry of [...pending]) {
					if (entry.at <= current.getTime()) {
						pending.splice(pending.indexOf(entry), 1);
						entry.run();
					}
				}
			},
			armed: () => pending.length,
		};
	}

	it("rolls to the next day when the clock passes midnight, and arms the one after", async () => {
		const hand = handClock(new Date(2026, 9, 23, 23, 59, 30));
		const { result } = await renderHook(() => useToday(hand.clock));
		expect(day(result.current)).toBe("2026-10-23");
		expect(hand.armed()).toBe(1);

		await act(() => hand.advance(31 * 1000));

		expect(day(result.current)).toBe("2026-10-24");
		expect(hand.armed()).toBe(1);
	});

	it("does not move before midnight", async () => {
		const hand = handClock(new Date(2026, 9, 23, 12, 0, 0));
		const { result } = await renderHook(() => useToday(hand.clock));
		await act(() => hand.advance(60 * 60 * 1000));
		expect(day(result.current)).toBe("2026-10-23");
	});

	it("cancels its timer when it unmounts", async () => {
		const hand = handClock(new Date(2026, 9, 23, 12, 0, 0));
		const { unmount } = await renderHook(() => useToday(hand.clock));
		await unmount();
		expect(hand.armed()).toBe(0);
	});
});
