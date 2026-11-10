import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { log } from "@/lib/logger/logger";
import { useReducedMotion } from "./use-reduced-motion";

describe("useReducedMotion", () => {
	let listener: (enabled: boolean) => void = () => {};
	const remove = jest.fn();

	beforeEach(() => {
		remove.mockClear();
		jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((
			_event: string,
			handler: (e: boolean) => void,
		) => {
			listener = handler;
			return { remove };
		}) as never);
	});

	afterEach(() => jest.restoreAllMocks());

	it("is false while Reduce Motion is off", async () => {
		jest
			.spyOn(AccessibilityInfo, "isReduceMotionEnabled")
			.mockResolvedValue(false);
		const { result } = await renderHook(() => useReducedMotion());
		await act(async () => {});
		expect(result.current).toBe(false);
	});

	it("is true when Reduce Motion is on at launch", async () => {
		jest
			.spyOn(AccessibilityInfo, "isReduceMotionEnabled")
			.mockResolvedValue(true);
		const { result } = await renderHook(() => useReducedMotion());
		await act(async () => {});
		expect(result.current).toBe(true);
	});

	it("follows the setting while mounted and unsubscribes on unmount", async () => {
		jest
			.spyOn(AccessibilityInfo, "isReduceMotionEnabled")
			.mockResolvedValue(false);
		const { result, unmount } = await renderHook(() => useReducedMotion());
		await act(async () => {});
		await act(async () => listener(true));
		expect(result.current).toBe(true);
		await act(async () => listener(false));
		expect(result.current).toBe(false);
		await unmount();
		expect(remove).toHaveBeenCalled();
	});

	it("logs a warning and stays false when the probe rejects", async () => {
		const warn = jest.spyOn(log, "warn").mockImplementation(() => {});
		const failure = new Error("probe failed");
		jest
			.spyOn(AccessibilityInfo, "isReduceMotionEnabled")
			.mockRejectedValue(failure);
		const { result } = await renderHook(() => useReducedMotion());
		await act(async () => {});
		expect(result.current).toBe(false);
		expect(warn).toHaveBeenCalledWith("a11y.reduce_motion_read_failed", {
			error: failure,
		});
	});
});
