import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { DestructiveConfirmSheet } from "./destructive-confirm-sheet";

function renderSheet(
	overrides: Partial<React.ComponentProps<typeof DestructiveConfirmSheet>> = {},
) {
	const props = {
		visible: true,
		headline: "Delete “Garden”?",
		body: "No habits use it, so nothing else changes.",
		keepLabel: "Keep category",
		confirmLabel: "Delete category",
		onKeep: jest.fn(),
		onConfirm: jest.fn(),
		...overrides,
	};
	return render(<DestructiveConfirmSheet {...props} />).then(() => props);
}

describe("DestructiveConfirmSheet", () => {
	it("plain: headline, consequence, keep first, delete last", async () => {
		const props = await renderSheet();
		expect(screen.getByText("Delete “Garden”?")).toBeTruthy();
		const order = screen
			.getAllByText(/Keep category|Delete category/)
			.map((node) => node.props.children);
		expect(order).toEqual(["Keep category", "Delete category"]);

		await fireEvent.press(screen.getByText("Keep category"));
		await fireEvent.press(screen.getByText("Delete category"));
		expect(props.onKeep).toHaveBeenCalled();
		expect(props.onConfirm).toHaveBeenCalled();
	});

	it("with preview: renders it inside the scrollable area, so nothing is cut off", async () => {
		await renderSheet({ preview: <Text>Music → Other</Text> });
		const scroll = screen.getByTestId("destructive-confirm-scroll");
		expect(scroll).toContainElement(screen.getByText("Music → Other"));
	});

	it("while working: both buttons are inert, so the delete can't fire twice", async () => {
		const props = await renderSheet({ isWorking: true });
		await fireEvent.press(screen.getByText("Delete category"));
		await fireEvent.press(screen.getByText("Keep category"));
		expect(props.onConfirm).not.toHaveBeenCalled();
		expect(props.onKeep).not.toHaveBeenCalled();
	});

	it("with archive action: a whole-card button between the copy and Keep", async () => {
		const onPress = jest.fn();
		await renderSheet({
			action: { title: "Archive instead", body: "Reversible.", onPress },
		});
		const order = screen
			.getAllByText(/^(Archive instead|Keep category|Delete category)$/)
			.map((node) => node.props.children);
		expect(order).toEqual([
			"Archive instead",
			"Keep category",
			"Delete category",
		]);

		await fireEvent.press(
			screen.getByRole("button", { name: "Archive instead. Reversible." }),
		);
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("while working: the archive card is inert too", async () => {
		const onPress = jest.fn();
		await renderSheet({
			isWorking: true,
			action: { title: "Archive instead", body: "Reversible.", onPress },
		});
		await fireEvent.press(screen.getByText("Archive instead"));
		expect(onPress).not.toHaveBeenCalled();
	});

	it("a double tap fires once, and locks every control until the handler settles", async () => {
		let settle = () => {};
		const onConfirm = jest.fn(
			() => new Promise<void>((resolve) => (settle = resolve)),
		);
		const onPress = jest.fn();
		const props = await renderSheet({
			onConfirm,
			action: { title: "Archive instead", body: "Reversible.", onPress },
		});
		const del = screen.getByText("Delete category");
		await fireEvent.press(del);
		await fireEvent.press(del);
		await fireEvent.press(screen.getByText("Archive instead"));
		await fireEvent.press(screen.getByText("Keep category"));
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onPress).not.toHaveBeenCalled();
		expect(props.onKeep).not.toHaveBeenCalled();

		await act(async () => settle());
		await fireEvent.press(screen.getByText("Keep category"));
		expect(props.onKeep).toHaveBeenCalledTimes(1);
	});

	it("a failed delete releases the lock, so it can be retried", async () => {
		const onConfirm = jest
			.fn()
			.mockRejectedValueOnce(new Error("disk full"))
			.mockResolvedValueOnce(undefined);
		await renderSheet({ onConfirm });
		await fireEvent.press(screen.getByText("Delete category"));
		await act(async () => {});
		await fireEvent.press(screen.getByText("Delete category"));
		expect(onConfirm).toHaveBeenCalledTimes(2);
	});

	it("can't be dismissed from the scrim", async () => {
		const props = await renderSheet();
		await fireEvent.press(screen.getByLabelText("Dismiss"));
		expect(props.onKeep).not.toHaveBeenCalled();
	});
});
