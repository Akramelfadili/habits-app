import { fireEvent, render, screen } from "@testing-library/react-native";
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

	it("can't be dismissed from the scrim", async () => {
		const props = await renderSheet();
		await fireEvent.press(screen.getByLabelText("Dismiss"));
		expect(props.onKeep).not.toHaveBeenCalled();
	});
});
