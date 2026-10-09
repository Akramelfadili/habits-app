import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { showToast, useToastStore } from "@/store/toast-store";
import * as reducedMotion from "@/utils/use-reduced-motion";
import { Sheet } from "./sheet";
import { ToastHost } from "./toast-host";

describe("Sheet", () => {
	afterEach(() => jest.restoreAllMocks());

	it("slides in by default and fades with Reduce Motion on", async () => {
		jest.spyOn(reducedMotion, "useReducedMotion").mockReturnValue(false);
		const { unmount } = await render(
			<Sheet visible onDismiss={jest.fn()}>
				<Text>Sheet body</Text>
			</Sheet>,
		);
		expect(screen.getByTestId("sheet-modal").props.animationType).toBe("slide");
		await unmount();

		jest.spyOn(reducedMotion, "useReducedMotion").mockReturnValue(true);
		await render(
			<Sheet visible onDismiss={jest.fn()}>
				<Text>Sheet body</Text>
			</Sheet>,
		);
		expect(screen.getByTestId("sheet-modal").props.animationType).toBe("fade");
	});

	it("renders its content when visible", async () => {
		await render(
			<Sheet visible onDismiss={jest.fn()}>
				<Text>Sheet body</Text>
			</Sheet>,
		);
		expect(screen.getByText("Sheet body")).toBeTruthy();
	});

	it("renders nothing when not visible", async () => {
		await render(
			<Sheet visible={false} onDismiss={jest.fn()}>
				<Text>Sheet body</Text>
			</Sheet>,
		);
		expect(screen.queryByText("Sheet body")).toBeNull();
	});

	it("dismisses on scrim tap", async () => {
		const onDismiss = jest.fn();
		await render(
			<Sheet visible onDismiss={onDismiss}>
				<Text>Sheet body</Text>
			</Sheet>,
		);
		await fireEvent.press(screen.getByLabelText("Dismiss"));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("ignores scrim taps when not dismissible", async () => {
		const onDismiss = jest.fn();
		await render(
			<Sheet visible dismissible={false} onDismiss={onDismiss}>
				<Text>Sheet body</Text>
			</Sheet>,
		);
		await fireEvent.press(screen.getByLabelText("Dismiss"));
		expect(onDismiss).not.toHaveBeenCalled();
	});

	describe("toasts while open", () => {
		beforeEach(() => useToastStore.setState({ toast: null, openSheets: 0 }));

		it("shows a toast raised while the sheet is open, once, instead of the page host", async () => {
			await render(
				<>
					<ToastHost />
					<Sheet visible onDismiss={jest.fn()}>
						<Text>Sheet body</Text>
					</Sheet>
				</>,
			);
			await act(() =>
				showToast({ message: "Couldn't save. Try again.", tone: "error" }),
			);
			expect(screen.getAllByText("Couldn't save. Try again.")).toHaveLength(1);
		});

		it("the page host shows it again once the sheet closes", async () => {
			const tree = (visible: boolean) => (
				<>
					<ToastHost />
					<Sheet visible={visible} onDismiss={jest.fn()}>
						<Text>Sheet body</Text>
					</Sheet>
				</>
			);
			const { rerender } = await render(tree(true));
			await act(() => showToast({ message: "Saved" }));
			await rerender(tree(false));
			expect(screen.getAllByText("Saved")).toHaveLength(1);
			expect(useToastStore.getState().openSheets).toBe(0);
		});
	});

	it("scrolls its content so large text or a small phone can't clip it", async () => {
		await render(
			<Sheet visible onDismiss={jest.fn()}>
				<Text>Sheet body</Text>
			</Sheet>,
		);
		const body = screen.getByText("Sheet body");
		let node = body.parent;
		let scroll: typeof node = null;
		while (node && !scroll) {
			if (node.props.keyboardShouldPersistTaps === "handled") scroll = node;
			node = node.parent;
		}
		expect(scroll).not.toBeNull();
	});
});
