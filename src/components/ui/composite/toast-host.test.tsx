import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { showToast, useToastStore } from "@/store/toast-store";
import { TOAST_DURATION_MS, ToastHost } from "./toast-host";

describe("ToastHost", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		useToastStore.setState({ toast: null });
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

		await act(() => jest.advanceTimersByTime(TOAST_DURATION_MS));
		expect(screen.queryByText("Archived 'Read'")).toBeNull();
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
});
