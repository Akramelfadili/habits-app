import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { showToast, useToastStore } from "@/store/toast-store";
import { motion } from "@/theme/theme";
import * as reducedMotion from "@/utils/use-reduced-motion";
import { Sheet } from "./sheet";
import { ToastHost } from "./toast-host";

// RN's own Modal keeps drawing while it slides out; Jest's drops it at once. This one draws always and shows `visible`.
jest.mock("react-native/Libraries/Modal/Modal", () => {
	const { View } = require("react-native");
	return {
		__esModule: true,
		default: ({ children, ...props }: { children: React.ReactNode }) => (
			<View {...props}>{children}</View>
		),
	};
});

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

	describe("closing", () => {
		beforeEach(() => jest.useFakeTimers());
		afterEach(() => jest.useRealTimers());

		it("is anchored to the bottom edge and shrinks instead of overflowing", async () => {
			await render(
				<Sheet visible onDismiss={jest.fn()}>
					<Text>Sheet body</Text>
				</Sheet>,
			);
			let node = screen.getByText("Sheet body").parent;
			let root: typeof node = null;
			while (node && !root) {
				if (node.props.accessibilityViewIsModal) root = node;
				node = node.parent;
			}
			expect(StyleSheet.flatten(root?.props.style)).toMatchObject({
				flex: 1,
				justifyContent: "flex-end",
			});
		});

		it("keeps the content it last showed through the slide-out, then unmounts", async () => {
			const tree = (visible: boolean, text: string) => (
				<Sheet visible={visible} onDismiss={jest.fn()}>
					<Text>{visible ? text : "blank"}</Text>
				</Sheet>
			);
			const view = await render(tree(true, "Quantity"));
			await view.rerender(tree(false, "Quantity"));
			expect(
				screen.getByTestId("sheet-modal", { includeHiddenElements: true }).props
					.visible,
			).toBe(false);
			// the caller already blanked its content, the sheet still shows the old one
			expect(screen.getByText("Quantity")).toBeTruthy();
			expect(screen.queryByText("blank")).toBeNull();

			await act(() => jest.advanceTimersByTime(motion.sheet.duration));
			expect(
				screen.queryByTestId("sheet-modal", { includeHiddenElements: true }),
			).toBeNull();
			expect(screen.queryByText("Quantity")).toBeNull();
		});

		it("reopens with the new content", async () => {
			const tree = (visible: boolean, text: string) => (
				<Sheet visible={visible} onDismiss={jest.fn()}>
					<Text>{text}</Text>
				</Sheet>
			);
			const view = await render(tree(true, "One"));
			await view.rerender(tree(false, "One"));
			await act(() => jest.advanceTimersByTime(motion.sheet.duration));
			await view.rerender(tree(true, "Two"));
			expect(screen.getByText("Two")).toBeTruthy();
		});

		it("clears its timer on unmount", async () => {
			const view = await render(
				<Sheet visible onDismiss={jest.fn()}>
					<Text>x</Text>
				</Sheet>,
			);
			await view.rerender(
				<Sheet visible={false} onDismiss={jest.fn()}>
					<Text>x</Text>
				</Sheet>,
			);
			const clear = jest.spyOn(global, "clearTimeout");
			await view.unmount();
			expect(clear).toHaveBeenCalled();
		});
	});
});
