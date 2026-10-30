import { renderHook } from "@testing-library/react-native";
import { AccessibilityInfo, Platform } from "react-native";
import { useInitialFocus } from "./use-initial-focus";

beforeEach(() => {
	jest.clearAllMocks();
	jest.useFakeTimers();
	jest.spyOn(AccessibilityInfo, "sendAccessibilityEvent").mockImplementation();
});

afterEach(() => {
	jest.useRealTimers();
	jest.restoreAllMocks();
});

const element = { focus: jest.fn() } as never;

describe("useInitialFocus", () => {
	it("sends a focus event to the element once the sheet has settled", async () => {
		await renderHook(() => useInitialFocus({ current: element }, true));
		expect(AccessibilityInfo.sendAccessibilityEvent).not.toHaveBeenCalled();
		jest.advanceTimersByTime(400);
		expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledWith(
			element,
			"focus",
		);
	});

	it("does nothing while inactive", async () => {
		await renderHook(() => useInitialFocus({ current: element }, false));
		jest.advanceTimersByTime(1000);
		expect(AccessibilityInfo.sendAccessibilityEvent).not.toHaveBeenCalled();
	});

	it("never fires late: closing before the delay cancels it", async () => {
		const view = await renderHook(
			({ active }: { active: boolean }) =>
				useInitialFocus({ current: element }, active),
			{ initialProps: { active: true } },
		);
		jest.advanceTimersByTime(100);
		await view.rerender({ active: false });
		jest.advanceTimersByTime(1000);
		expect(AccessibilityInfo.sendAccessibilityEvent).not.toHaveBeenCalled();
	});

	it("on the web it focuses the element itself", async () => {
		const original = Platform.OS;
		Platform.OS = "web";
		const focus = jest.fn();
		await renderHook(() =>
			useInitialFocus({ current: { focus } as never }, true),
		);
		jest.advanceTimersByTime(400);
		Platform.OS = original;
		expect(focus).toHaveBeenCalledTimes(1);
		expect(AccessibilityInfo.sendAccessibilityEvent).not.toHaveBeenCalled();
	});
});
