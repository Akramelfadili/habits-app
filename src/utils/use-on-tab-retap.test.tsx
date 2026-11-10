import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useTabRetapStore } from "@/store/tab-retap-store";
import { useOnTabRetap, useTabRetapToTop } from "./use-on-tab-retap";

describe("useOnTabRetap", () => {
	it("answers a re-tap of its own tab, not of another", async () => {
		const handler = jest.fn();
		await renderHook(() => useOnTabRetap("(today)", handler));
		await act(async () => useTabRetapStore.getState().retap("(habits)"));
		expect(handler).not.toHaveBeenCalled();
		await act(async () => useTabRetapStore.getState().retap("(today)"));
		await act(async () => useTabRetapStore.getState().retap("(today)"));
		expect(handler).toHaveBeenCalledTimes(2);
	});

	it("stops listening when the screen goes", async () => {
		const handler = jest.fn();
		const { unmount } = await renderHook(() =>
			useOnTabRetap("(progress)", handler),
		);
		await unmount();
		await act(async () => useTabRetapStore.getState().retap("(progress)"));
		expect(handler).not.toHaveBeenCalled();
	});
});

describe("useTabRetapToTop", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it("scrolls up, then focuses the title once the scroll has settled", async () => {
		const send = jest
			.spyOn(AccessibilityInfo, "sendAccessibilityEvent")
			.mockImplementation();
		const scrollToTop = jest.fn();
		const { unmount } = await renderHook(() =>
			useTabRetapToTop("(today)", scrollToTop, { current: {} as never }),
		);
		await act(async () => useTabRetapStore.getState().retap("(today)"));
		expect(scrollToTop).toHaveBeenCalledTimes(1);
		expect(send).not.toHaveBeenCalled();
		await act(() => jest.advanceTimersByTime(400));
		expect(send).toHaveBeenCalledTimes(1);
		await unmount();
	});

	it("never moves focus after the screen is gone", async () => {
		const send = jest
			.spyOn(AccessibilityInfo, "sendAccessibilityEvent")
			.mockImplementation();
		const title = { id: "gone" } as never;
		const { unmount } = await renderHook(() =>
			useTabRetapToTop("(second)", jest.fn(), { current: title }),
		);
		await act(async () => useTabRetapStore.getState().retap("(second)"));
		await unmount();
		jest.advanceTimersByTime(1000);
		expect(send.mock.calls.map(([target]) => target)).not.toContain(title);
	});
});
