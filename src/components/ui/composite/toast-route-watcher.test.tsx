import { act, render, screen } from "@testing-library/react-native";
import { showToast, useToastStore } from "@/store/toast-store";
import { motion } from "@/theme/theme";
import { ToastRouteWatcher } from "./toast-route-watcher";

let mockPathname = "/";
let mockScreenReader = false;
jest.mock("@/utils/use-screen-reader", () => ({
	useScreenReader: () => mockScreenReader,
}));
jest.mock("expo-router", () => ({ usePathname: () => mockPathname }));

const message = () => useToastStore.getState().toast?.message;

describe("ToastRouteWatcher", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		useToastStore.setState({ toast: null });
		mockPathname = "/";
		mockScreenReader = false;
	});
	afterEach(() => jest.useRealTimers());

	it("keeps a toast raised by the action that changed the screen", async () => {
		const view = await render(<ToastRouteWatcher />);
		await act(() => showToast({ message: "Archived" }));
		mockPathname = "/habit/1";
		await view.rerender(<ToastRouteWatcher />);
		expect(message()).toBe("Archived");
	});

	it("dismisses a toast that has been up a while when the screen changes", async () => {
		const view = await render(<ToastRouteWatcher />);
		await act(() => showToast({ message: "Archived" }));
		await act(() =>
			jest.advanceTimersByTime(motion.toast.navigationGrace + 100),
		);
		mockPathname = "/progress";
		await view.rerender(<ToastRouteWatcher />);
		expect(message()).toBeUndefined();
		expect(screen.toJSON()).toBeNull();
	});

	it("keeps a toast through a screen change with a screen reader on", async () => {
		mockScreenReader = true;
		const view = await render(<ToastRouteWatcher />);
		await act(() => showToast({ message: "Archived" }));
		await act(() =>
			jest.advanceTimersByTime(motion.toast.navigationGrace + 100),
		);
		mockPathname = "/progress";
		await view.rerender(<ToastRouteWatcher />);
		expect(message()).toBe("Archived");
	});
});
