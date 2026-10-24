import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Toast } from "./toast";

describe("Toast", () => {
	it("renders the message", async () => {
		await render(<Toast message="Marked 'Upper body' complete" />);
		expect(screen.getByText("Marked 'Upper body' complete")).toBeTruthy();
	});

	it("omits the action when none is given", async () => {
		await render(<Toast message="Marked 'Upper body' complete" />);
		expect(screen.queryByText("Undo")).toBeNull();
	});

	it("fires onAction when the action is pressed", async () => {
		const onAction = jest.fn();
		await render(
			<Toast
				message="Marked 'Upper body' complete"
				actionLabel="Undo"
				onAction={onAction}
			/>,
		);
		await fireEvent.press(screen.getByText("Undo"));
		expect(onAction).toHaveBeenCalledTimes(1);
	});

	it("shows a danger marker only for the error tone", async () => {
		const { rerender } = await render(<Toast message="Saved" />);
		expect(screen.queryByTestId("toast-error-marker")).toBeNull();

		await rerender(<Toast message="Couldn't save" tone="error" />);
		expect(screen.getByTestId("toast-error-marker")).toBeTruthy();
	});

	it("limits the message to two lines and keeps the full text for screen readers", async () => {
		const long = "Marked 'A very long habit name that keeps going' complete";
		await render(<Toast message={long} />);
		const text = screen.getByText(long);
		expect(text.props.numberOfLines).toBe(2);
		expect(text.props.accessibilityLabel).toBe(long);
	});

	it("gives Undo a 44pt-tall touch area", async () => {
		await render(
			<Toast message="Archived" actionLabel="Undo" onAction={jest.fn()} />,
		);
		const button = screen.getByRole("button", { name: "Undo" });
		expect(StyleSheet.flatten(button.props.style).minHeight).toBe(44);
	});
});
