import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, StyleSheet } from "react-native";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { showToast, useToastStore } from "@/store/toast-store";
import { motion } from "@/theme/theme";
import { ToastHost, toastHoldMs } from "./toast-host";

const TOAST_DURATION_MS = motion.toast.hold.info;
const { out: OUT_MS, in: IN_MS } = motion.toast;

let mockReduced = false;
jest.mock("@/utils/use-reduced-motion", () => ({
	useReducedMotion: () => mockReduced,
}));

const toastStyle = () =>
	StyleSheet.flatten(screen.getByTestId("toast-host").props.style);

describe("ToastHost", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		useToastStore.setState({ toast: null });
		mockReduced = false;
	});
	afterEach(() => jest.useRealTimers());

	it("renders nothing until a toast is shown", async () => {
		await render(<ToastHost />);
		expect(screen.queryByText(/./)).toBeNull();
	});

	it("shows a toast, then dismisses it after the duration", async () => {
		await render(<ToastHost />);
		await act(() => showToast({ message: "Archived 'Read'" }));
		expect(screen.getByText("Archived 'Read'")).toBeTruthy();

		await act(() => jest.advanceTimersByTime(TOAST_DURATION_MS + OUT_MS));
		expect(screen.queryByText("Archived 'Read'")).toBeNull();
	});

	describe("enter and exit", () => {
		it("fades and rises in over the named duration", async () => {
			await render(<ToastHost />);
			await act(() => showToast({ message: "Saved" }));
			expect(toastStyle().opacity).toBe(0);
			await act(() => jest.advanceTimersByTime(IN_MS / 2));
			const half = toastStyle().opacity;
			expect(half).toBeGreaterThan(0);
			expect(half).toBeLessThan(1);
			await act(() => jest.advanceTimersByTime(IN_MS));
			expect(toastStyle().opacity).toBe(1);
		});

		it("is still on screen while it fades out, and gone when the exit ends", async () => {
			await render(<ToastHost />);
			await act(() => showToast({ message: "Saved" }));
			await act(() => jest.advanceTimersByTime(IN_MS + 10));
			const id = useToastStore.getState().toast?.id as number;
			await act(() => useToastStore.getState().dismissToast(id));
			await act(() => jest.advanceTimersByTime(OUT_MS - 50));
			expect(screen.getByText("Saved")).toBeTruthy();
			await act(() => jest.advanceTimersByTime(100));
			expect(screen.queryByText("Saved")).toBeNull();
		});

		it("hides within the hold plus the exit, so an info toast is gone by 3.2 s", async () => {
			await render(<ToastHost />);
			await act(() => showToast({ message: "Saved" }));
			await act(() =>
				jest.advanceTimersByTime(motion.toast.hold.info + OUT_MS + 20),
			);
			expect(screen.queryByText("Saved")).toBeNull();
		});

		it("replaces the old toast at once, without stacking", async () => {
			await render(<ToastHost />);
			await act(() => showToast({ message: "First" }));
			await act(() => jest.advanceTimersByTime(IN_MS + 10));
			await act(() => showToast({ message: "Second" }));
			expect(screen.queryByText("First")).toBeNull();
			expect(screen.getAllByTestId("toast")).toHaveLength(1);
			expect(screen.getByText("Second")).toBeTruthy();
			expect(toastStyle().opacity).toBe(1);
		});

		it("crossfades with no rise under Reduce Motion", async () => {
			mockReduced = true;
			await render(<ToastHost />);
			await act(() => showToast({ message: "Saved" }));
			expect(toastStyle().transform[0].translateY).toBe(0);
			await act(() =>
				jest.advanceTimersByTime(motion.toast.reduced.crossfade + 10),
			);
			expect(toastStyle().opacity).toBe(1);
		});

		it("is dismissed by a tap on the toast", async () => {
			await render(<ToastHost />);
			await act(() => showToast({ message: "Saved" }));
			await fireEvent.press(screen.getByText("Saved"));
			await act(() => jest.advanceTimersByTime(OUT_MS + 10));
			expect(screen.queryByText("Saved")).toBeNull();
		});

		it("clears its timer on unmount", async () => {
			const view = await render(<ToastHost />);
			await act(() => showToast({ message: "Saved" }));
			await view.unmount();
			await act(() => jest.advanceTimersByTime(motion.toast.hold.info * 2));
			// The hold timer did not fire after unmount: the slot is untouched.
			expect(useToastStore.getState().toast?.message).toBe("Saved");
		});
	});

	it("runs the action once and dismisses", async () => {
		const onUndo = jest.fn();
		await render(<ToastHost />);
		await act(() =>
			showToast({
				message: "Marked 'Read' complete",
				actionLabel: "Undo",
				onAction: onUndo,
			}),
		);

		await fireEvent.press(screen.getByText("Undo"));
		await act(() => jest.advanceTimersByTime(OUT_MS + 10));

		expect(onUndo).toHaveBeenCalledTimes(1);
		expect(screen.queryByText("Marked 'Read' complete")).toBeNull();
	});

	it("restarts the timer when a newer toast replaces the old one", async () => {
		await render(<ToastHost />);
		await act(() => showToast({ message: "First" }));
		await act(() => jest.advanceTimersByTime(TOAST_DURATION_MS - 500));
		await act(() => showToast({ message: "Second" }));
		await act(() => jest.advanceTimersByTime(1000));

		expect(screen.getByText("Second")).toBeTruthy();
	});

	describe("placement above the tab bar (T-21)", () => {
		async function hostBottom(props: Record<string, unknown> = {}) {
			await render(<ToastHost {...props} />);
			await act(() => showToast({ message: "Archived 'Read'" }));
			return StyleSheet.flatten(screen.getByTestId("toast-host").props.style)
				.bottom;
		}

		it("keeps a plain 16 pt screen margin with no bar under it", async () => {
			expect(await hostBottom()).toBe(16);
		});

		// pillToastOffset(34) = 34 inset + 22 float + 56 pill + 12 gap.
		it("floats where the shell says — 12 pt above the pill", async () => {
			expect(await hostBottom({ bottomOffset: 124 })).toBe(124);
		});
	});

	it("renders an error-tone toast", async () => {
		await render(<ToastHost />);
		await act(() =>
			showToast({
				message: "Couldn't archive this habit. Try again.",
				tone: "error",
			}),
		);
		expect(screen.getByTestId("toast-error-marker")).toBeTruthy();
	});

	it.each([
		[
			"throws",
			() => {
				throw new Error("boom");
			},
		],
		["rejects", () => Promise.reject(new Error("boom"))],
	])(
		"an Undo that %s is logged and answered with an error toast",
		async (_name, undo) => {
			clearLog();
			await render(<ToastHost />);
			await act(() =>
				showToast({
					message: "Marked 'Read' complete",
					actionLabel: "Undo",
					onAction: undo,
				}),
			);

			await fireEvent.press(screen.getByText("Undo"));

			await screen.findByText("Couldn't undo that.");
			expect(screen.getByTestId("toast-error-marker")).toBeTruthy();
			expect(getLogEntries().map((entry) => entry.level)).toEqual(["error"]);
		},
	);

	describe("screen reader (A6-02)", () => {
		let announce: jest.SpyInstance;

		beforeEach(() => {
			announce = jest
				.spyOn(AccessibilityInfo, "announceForAccessibility")
				.mockImplementation(() => {});
			announce.mockClear();
			jest
				.spyOn(AccessibilityInfo, "isScreenReaderEnabled")
				.mockResolvedValue(false);
			useToastStore.setState({ toast: null, openSheets: 0 });
		});
		afterEach(() => jest.restoreAllMocks());

		it("announces the visible message once per toast, not on re-render", async () => {
			const { rerender } = await render(<ToastHost />);
			await act(() => showToast({ message: "Archived 'Read'" }));
			expect(announce).toHaveBeenCalledTimes(1);
			expect(announce).toHaveBeenCalledWith("Archived 'Read'");

			await rerender(<ToastHost />);
			await act(() => jest.advanceTimersByTime(1000));
			expect(announce).toHaveBeenCalledTimes(1);

			await act(() => showToast({ message: "Archived 'Read'" }));
			expect(announce).toHaveBeenCalledTimes(2);
		});

		it("does not announce for the page host while a sheet is open", async () => {
			useToastStore.setState({ openSheets: 1 });
			await render(<ToastHost />);
			await act(() => showToast({ message: "Hidden behind a sheet" }));
			expect(announce).not.toHaveBeenCalled();
		});

		it("keeps every toast until it is dismissed with a screen reader on", async () => {
			jest
				.spyOn(AccessibilityInfo, "isScreenReaderEnabled")
				.mockResolvedValue(true);
			await render(<ToastHost />);
			await act(async () => {});
			await act(() => showToast({ message: "Archived 'Read'" }));

			await act(() => jest.advanceTimersByTime(motion.toast.hold.warning * 4));
			expect(screen.getByText("Archived 'Read'")).toBeTruthy();
		});
	});

	describe("hold times (HAB-48)", () => {
		it("is 5 s for an Undo, 3 s for info and success, 6 s for a warning, never for an error", () => {
			expect(toastHoldMs({ message: "m", actionLabel: "Undo" })).toBe(5000);
			expect(toastHoldMs({ message: "m" })).toBe(3000);
			expect(toastHoldMs({ message: "m", tone: "success" })).toBe(3000);
			expect(toastHoldMs({ message: "m", tone: "warning" })).toBe(6000);
			expect(toastHoldMs({ message: "m", tone: "error" })).toBeNull();
			expect(
				toastHoldMs({ message: "m", tone: "error", actionLabel: "Retry" }),
			).toBeNull();
		});

		it("keeps an error up until it is dismissed", async () => {
			await render(<ToastHost />);
			await act(() => showToast({ message: "Couldn't save", tone: "error" }));
			await act(() => jest.advanceTimersByTime(60_000));
			expect(screen.getByText("Couldn't save")).toBeTruthy();
		});

		it("dismisses through the accessibility dismiss action", async () => {
			await render(<ToastHost />);
			await act(() => showToast({ message: "Couldn't save", tone: "error" }));
			await act(() =>
				screen.getByTestId("toast-host").props.onAccessibilityAction({
					nativeEvent: { actionName: "dismiss" },
				}),
			);
			await act(() => jest.advanceTimersByTime(OUT_MS + 10));
			expect(screen.queryByText("Couldn't save")).toBeNull();
		});
	});
});
