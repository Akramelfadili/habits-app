import { act, renderHook } from "@testing-library/react-native";
import { useDelayedFlag } from "./use-delayed-flag";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("useDelayedFlag", () => {
	it("is false at first and turns true only after the delay", async () => {
		const { result } = await renderHook(() => useDelayedFlag(true, 300));
		expect(result.current).toBe(false);

		await act(() => jest.advanceTimersByTime(299));
		expect(result.current).toBe(false);

		await act(() => jest.advanceTimersByTime(1));
		expect(result.current).toBe(true);
	});

	it("never turns true when the wait ends before the delay (no flash on a fast load)", async () => {
		const { result, rerender } = await renderHook(
			({ active }: { active: boolean }) => useDelayedFlag(active, 300),
			{ initialProps: { active: true } },
		);
		await act(() => jest.advanceTimersByTime(200));
		await rerender({ active: false });
		await act(() => jest.advanceTimersByTime(1000));
		expect(result.current).toBe(false);
	});

	it("goes false the moment the wait ends, and starts a fresh delay next time", async () => {
		const { result, rerender } = await renderHook(
			({ active }: { active: boolean }) => useDelayedFlag(active, 300),
			{ initialProps: { active: true } },
		);
		await act(() => jest.advanceTimersByTime(300));
		expect(result.current).toBe(true);

		await rerender({ active: false });
		expect(result.current).toBe(false);

		await rerender({ active: true });
		expect(result.current).toBe(false);
		await act(() => jest.advanceTimersByTime(300));
		expect(result.current).toBe(true);
	});
});
