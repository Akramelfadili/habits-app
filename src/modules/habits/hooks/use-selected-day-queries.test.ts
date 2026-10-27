import { act, renderHook } from "@testing-library/react-native";
import { toDayKey } from "@/utils/day-key";
import { useSelectedDayQueries } from "./use-selected-day-queries";

const key = (date: Date) => toDayKey(date);

describe("useSelectedDayQueries", () => {
	beforeEach(() => {
		jest.useFakeTimers({
			now: new Date(2026, 9, 14, 12),
			doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
		});
	});
	afterEach(() => jest.useRealTimers());

	it("follows today by default", async () => {
		const { result } = await renderHook(() => useSelectedDayQueries());
		expect(result.current.selectedKey).toBeNull();
		expect(key(result.current.selectedDay)).toBe("2026-10-14");
		expect(result.current.isPastDay).toBe(false);
	});

	it("selects a past day, and choosing today (or Show today) follows it again", async () => {
		const { result } = await renderHook(() => useSelectedDayQueries());
		await act(() => result.current.selectDay(new Date(2026, 9, 12)));
		expect(result.current.selectedKey).toBe("2026-10-12");
		expect(result.current.isPastDay).toBe(true);

		await act(() => result.current.selectDay(new Date(2026, 9, 14)));
		expect(result.current.selectedKey).toBeNull();

		await act(() => result.current.selectDay(new Date(2026, 9, 12)));
		await act(() => result.current.showToday());
		expect(result.current.selectedKey).toBeNull();
	});

	it("ignores a future day", async () => {
		const { result } = await renderHook(() => useSelectedDayQueries());
		await act(() => result.current.selectDay(new Date(2026, 9, 15)));
		expect(result.current.selectedKey).toBeNull();
		await act(() => result.current.selectDay(new Date(2026, 9, 12)));
		await act(() => result.current.selectDay(new Date(2026, 9, 20)));
		expect(result.current.selectedKey).toBe("2026-10-12");
	});

	it("moves a followed day across midnight", async () => {
		const { result } = await renderHook(() => useSelectedDayQueries());
		await act(() => {
			jest.setSystemTime(new Date(2026, 9, 15, 0, 0, 30));
			jest.advanceTimersByTime(13 * 60 * 60 * 1000);
		});
		expect(key(result.current.selectedDay)).toBe("2026-10-15");
		expect(result.current.selectedKey).toBeNull();
	});

	it("keeps a past selection across midnight while today moves on", async () => {
		const { result } = await renderHook(() => useSelectedDayQueries());
		await act(() => result.current.selectDay(new Date(2026, 9, 12)));
		await act(() => {
			jest.setSystemTime(new Date(2026, 9, 15, 0, 0, 30));
			jest.advanceTimersByTime(13 * 60 * 60 * 1000);
		});
		expect(key(result.current.today)).toBe("2026-10-15");
		expect(key(result.current.selectedDay)).toBe("2026-10-12");
	});
});
