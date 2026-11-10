import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { log } from "@/lib/logger/logger";
import { useReducedTransparency } from "./use-reduced-transparency";

describe("useReducedTransparency", () => {
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

	it("is false while Reduce Transparency is off", async () => {
		jest
			.spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
			.mockResolvedValue(false);
		const { result } = await renderHook(() => useReducedTransparency());
		await act(async () => {});
		expect(result.current).toBe(false);
	});

	it("is true when Reduce Transparency is on at launch", async () => {
		jest
			.spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
			.mockResolvedValue(true);
		const { result } = await renderHook(() => useReducedTransparency());
		await act(async () => {});
		expect(result.current).toBe(true);
	});

	it("stays false when the platform rejects the query", async () => {
		jest
			.spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
			.mockRejectedValue(new Error("unsupported"));
		const { result } = await renderHook(() => useReducedTransparency());
		await act(async () => {});
		expect(result.current).toBe(false);
	});

	// react-native-web has no such method at all — calling it threw a TypeError
	// that took the whole app to the error boundary.
	it("stays false, and does not subscribe, where the method is missing", async () => {
		const original = AccessibilityInfo.isReduceTransparencyEnabled;
		// biome-ignore lint/suspicious/noExplicitAny: standing in for a platform that lacks the method
		(AccessibilityInfo as any).isReduceTransparencyEnabled = undefined;
		jest.mocked(AccessibilityInfo.addEventListener).mockClear();
		try {
			const { result } = await renderHook(() => useReducedTransparency());
			await act(async () => {});
			expect(result.current).toBe(false);
			expect(AccessibilityInfo.addEventListener).not.toHaveBeenCalled();
		} finally {
			AccessibilityInfo.isReduceTransparencyEnabled = original;
		}
	});

	it("follows the setting while mounted and unsubscribes on unmount", async () => {
		jest
			.spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
			.mockResolvedValue(false);
		const { result, unmount } = await renderHook(() =>
			useReducedTransparency(),
		);
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
			.spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
			.mockRejectedValue(failure);
		const { result } = await renderHook(() => useReducedTransparency());
		await act(async () => {});
		expect(result.current).toBe(false);
		expect(warn).toHaveBeenCalledWith("a11y.reduce_transparency_read_failed", {
			error: failure,
		});
	});
});
