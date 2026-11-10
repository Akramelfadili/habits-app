import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { AccessibilityInfo, Text } from "react-native";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { useHapticsStore } from "@/store/haptics-store";
import { useToastStore } from "@/store/toast-store";
import { semanticColors } from "@/theme/theme";
import { failureMessage } from "@/utils/failure-message";
import { runSafely } from "@/utils/run-safely";
import { DestructiveConfirmSheet } from "./destructive-confirm-sheet";

jest.mock("expo-haptics", () => ({
	selectionAsync: jest.fn(async () => undefined),
	notificationAsync: jest.fn(async () => undefined),
	NotificationFeedbackType: { Success: "success", Warning: "warning" },
}));

let mockAccessibilityText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockAccessibilityText,
}));

// The sheet's slide, its focus timer and the error toast's fade all run on
// timers; faked from the start, none can fire outside act or into a later test.
beforeEach(() => {
	jest.useFakeTimers();
	mockAccessibilityText = false;
});
afterEach(() => jest.useRealTimers());

const SAFE = {
	title: "Archive instead",
	body: "Hide from Today, keep history",
};

function renderSheet(
	overrides: Partial<React.ComponentProps<typeof DestructiveConfirmSheet>> = {},
) {
	const props = {
		visible: true,
		headline: "Delete “Garden”?",
		body: "No habits use it, so nothing else changes.",
		confirmLabel: "Delete category",
		cancelLabel: "Cancel",
		onCancel: jest.fn(),
		onConfirm: jest.fn(),
		...overrides,
	};
	return render(<DestructiveConfirmSheet {...props} />).then(() => props);
}

describe("DestructiveConfirmSheet", () => {
	it("plain: headline, consequence, the destructive action, then Cancel last", async () => {
		const props = await renderSheet();
		expect(screen.getByText("Delete “Garden”?")).toBeTruthy();
		const order = screen
			.getAllByText(/^(Cancel|Delete category)$/)
			.map((node) => node.props.children);
		expect(order).toEqual(["Delete category", "Cancel"]);

		await fireEvent.press(screen.getByText("Cancel"));
		await fireEvent.press(screen.getByText("Delete category"));
		expect(props.onCancel).toHaveBeenCalled();
		expect(props.onConfirm).toHaveBeenCalled();
	});

	it("confirming gives a warning haptic; cancelling gives none; off gives none", async () => {
		useHapticsStore.setState({ enabled: true });
		(Haptics.notificationAsync as jest.Mock).mockClear();
		await renderSheet();
		await fireEvent.press(screen.getByText("Cancel"));
		expect(Haptics.notificationAsync).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByText("Delete category"));
		expect(Haptics.notificationAsync).toHaveBeenCalledWith("warning");

		useHapticsStore.setState({ enabled: false });
		(Haptics.notificationAsync as jest.Mock).mockClear();
		await renderSheet();
		await fireEvent.press(
			screen.getAllByText("Delete category").at(-1) as never,
		);
		expect(Haptics.notificationAsync).not.toHaveBeenCalled();
		useHapticsStore.setState({ enabled: true });
	});

	it("has no Close: Cancel is the one way out", async () => {
		await renderSheet();
		expect(screen.queryByText("Close")).toBeNull();
		expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
	});

	it("the destructive action is an outlined pill with red text, never filled", async () => {
		await renderSheet();
		const button = screen.getByRole("button", { name: "Delete category" });
		expect(button).not.toHaveStyle({
			backgroundColor: semanticColors.light.dangerBg,
		});
		expect(screen.getByText("Delete category")).toHaveStyle({
			color: semanticColors.light.dangerBg,
		});
	});

	it("with preview: renders it inside the scrollable area, so nothing is cut off", async () => {
		await renderSheet({ preview: <Text>Music → Other</Text> });
		const scroll = screen.getByTestId("destructive-confirm-scroll");
		expect(scroll).toContainElement(screen.getByText("Music → Other"));
	});

	it("the scrim and swipe-down are Cancel", async () => {
		const props = await renderSheet();
		await fireEvent.press(screen.getByLabelText("Dismiss"));
		expect(props.onCancel).toHaveBeenCalledTimes(1);
	});

	describe("with a safe action (Archive instead)", () => {
		it("comes first, then the destructive action, then Cancel", async () => {
			const onPress = jest.fn();
			await renderSheet({
				confirmLabel: "Delete permanently",
				safeAction: { ...SAFE, onPress },
			});
			const order = screen
				.getAllByText(/^(Archive instead|Cancel|Delete permanently)$/)
				.map((node) => node.props.children);
			expect(order).toEqual([
				"Archive instead",
				"Delete permanently",
				"Cancel",
			]);

			await fireEvent.press(
				screen.getByRole("button", {
					name: "Archive instead. Hide from Today, keep history",
				}),
			);
			expect(onPress).toHaveBeenCalledTimes(1);
		});

		it("takes the screen reader's focus once the sheet has settled (08.3)", async () => {
			jest
				.spyOn(AccessibilityInfo, "sendAccessibilityEvent")
				.mockImplementation();
			await renderSheet({ safeAction: { ...SAFE, onPress: jest.fn() } });
			await act(async () => jest.advanceTimersByTime(500));
			expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledTimes(1);
			expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledWith(
				expect.anything(),
				"focus",
			);
			jest.restoreAllMocks();
		});

		it("while working: the safe action is inert too", async () => {
			const onPress = jest.fn();
			await renderSheet({
				isWorking: true,
				safeAction: { ...SAFE, onPress },
			});
			await fireEvent.press(screen.getByText("Archive instead"));
			expect(onPress).not.toHaveBeenCalled();
		});
	});

	describe("hint and busy state", () => {
		it("shows the hint under the destructive action", async () => {
			await renderSheet({
				confirmHint: "One tap deletes. This can’t be undone.",
			});
			expect(
				screen.getByText("One tap deletes. This can’t be undone."),
			).toBeTruthy();
		});

		it("busy: the label says what is happening, Cancel is disabled and the hint changes (DC3)", async () => {
			const props = await renderSheet({
				isWorking: true,
				confirmHint: "One tap deletes. This can’t be undone.",
				busy: {
					label: "Deleting…",
					hint: "Keep the app open — this takes a moment.",
				},
			});
			expect(screen.getByText("Deleting…")).toBeTruthy();
			expect(screen.queryByText("Delete category")).toBeNull();
			expect(
				screen.getByText("Keep the app open — this takes a moment."),
			).toBeTruthy();
			expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

			await fireEvent.press(screen.getByText("Deleting…"));
			await fireEvent.press(screen.getByText("Cancel"));
			expect(props.onConfirm).not.toHaveBeenCalled();
			expect(props.onCancel).not.toHaveBeenCalled();
		});

		it("busy: the sheet can't be dismissed from the scrim", async () => {
			const props = await renderSheet({ isWorking: true });
			await fireEvent.press(screen.getByLabelText("Dismiss"));
			expect(props.onCancel).not.toHaveBeenCalled();
		});

		it("at large text the hint isn't drawn at full size, but is still announced (DC7)", async () => {
			mockAccessibilityText = true;
			await renderSheet({
				confirmHint: "One tap deletes. This can’t be undone.",
			});
			const hint = screen.getByText("One tap deletes. This can’t be undone.");
			expect(hint).toHaveStyle({ height: 0 });
			expect(hint.props.accessibilityLiveRegion).toBe("polite");
		});
	});

	describe("an error banner (DC4)", () => {
		it("sits in the sheet, names what failed, and leaves the destructive action there to try again", async () => {
			const props = await renderSheet({
				error: {
					title: "Couldn’t delete",
					message: "Nothing was changed. Try again.",
				},
			});
			expect(screen.getByRole("alert")).toHaveProp(
				"accessibilityLabel",
				"Couldn’t delete. Nothing was changed. Try again.",
			);
			await fireEvent.press(screen.getByText("Delete category"));
			expect(props.onConfirm).toHaveBeenCalledTimes(1);
		});

		it("is absent without an error", async () => {
			await renderSheet();
			expect(screen.queryByRole("alert")).toBeNull();
		});
	});

	it("while working: every control is inert, so the delete can't fire twice", async () => {
		const props = await renderSheet({ isWorking: true });
		await fireEvent.press(screen.getByText("Delete category"));
		await fireEvent.press(screen.getByText("Cancel"));
		expect(props.onConfirm).not.toHaveBeenCalled();
		expect(props.onCancel).not.toHaveBeenCalled();
	});

	it("a double tap fires once, and locks every control until the handler settles", async () => {
		let settle = () => {};
		const onConfirm = jest.fn(
			() => new Promise<void>((resolve) => (settle = resolve)),
		);
		const onPress = jest.fn();
		const props = await renderSheet({
			onConfirm,
			safeAction: { ...SAFE, onPress },
		});
		const del = screen.getByText("Delete category");
		await fireEvent.press(del);
		await fireEvent.press(del);
		await fireEvent.press(screen.getByText("Archive instead"));
		await fireEvent.press(screen.getByText("Cancel"));
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onPress).not.toHaveBeenCalled();
		expect(props.onCancel).not.toHaveBeenCalled();

		await act(async () => settle());
		await fireEvent.press(screen.getByText("Cancel"));
		expect(props.onCancel).toHaveBeenCalledTimes(1);
	});

	describe("when the delete fails", () => {
		beforeEach(() => {
			useToastStore.setState({ toast: null });
			clearLog();
		});

		it("a handler wrapped in run(): error toast, lock released, a retry works", async () => {
			let attempts = 0;
			const onConfirm = jest.fn(() =>
				runSafely(
					{ scope: "t", failure: failureMessage("delete", "this category") },
					async () => {
						attempts++;
						if (attempts === 1) throw new Error("disk full");
					},
				),
			);
			await renderSheet({ onConfirm });

			await fireEvent.press(screen.getByText("Delete category"));
			await act(async () => {});

			expect(useToastStore.getState().toast).toMatchObject({
				message: "Couldn't delete this category. Try again.",
				tone: "error",
			});
			expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
			expect(
				screen.getByRole("button", { name: "Delete category" }),
			).toBeEnabled();

			await fireEvent.press(screen.getByText("Delete category"));
			await act(async () => {});
			expect(onConfirm).toHaveBeenCalledTimes(2);
		});

		it("a handler that rejects anyway: logged, generic error toast, lock released, a retry works", async () => {
			const onConfirm = jest
				.fn()
				.mockRejectedValueOnce(new Error("disk full"))
				.mockResolvedValueOnce(undefined);
			await renderSheet({ onConfirm });

			await fireEvent.press(screen.getByText("Delete category"));
			await act(async () => {});

			expect(useToastStore.getState().toast).toMatchObject({
				message: "Something went wrong. Try again.",
				tone: "error",
			});
			expect(getLogEntries().map((e) => e.level)).toEqual(["warn"]);
			expect(
				screen.getByRole("button", { name: "Delete category" }),
			).toBeEnabled();

			await fireEvent.press(screen.getByText("Delete category"));
			expect(onConfirm).toHaveBeenCalledTimes(2);
		});

		it("the safe action releases the lock the same way", async () => {
			const onPress = jest
				.fn()
				.mockRejectedValueOnce(new Error("disk full"))
				.mockResolvedValueOnce(undefined);
			await renderSheet({ safeAction: { ...SAFE, onPress } });

			await fireEvent.press(
				screen.getByRole("button", { name: /^Archive instead/ }),
			);
			await act(async () => {});
			await fireEvent.press(
				screen.getByRole("button", { name: /^Archive instead/ }),
			);

			expect(onPress).toHaveBeenCalledTimes(2);
		});
	});
});
