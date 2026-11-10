import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

let mockAccessibilityText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockAccessibilityText,
}));

import { Toast } from "./toast";

beforeEach(() => {
	mockAccessibilityText = false;
});

describe("Toast", () => {
	it("at accessibility sizes wraps the whole message and drops the action below it", async () => {
		mockAccessibilityText = true;
		const long = "Couldn't update this habit. Try again in a moment, please.";
		await render(<Toast message={long} actionLabel="Retry" />);
		expect(screen.getByText(long).props.numberOfLines).toBeUndefined();
		const root = screen.getByTestId("toast");
		expect(StyleSheet.flatten(root.props.style).flexDirection).toBe("column");
	});

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

	it("marks every tone but info with its own glyph (colour is never the only signal)", async () => {
		const { rerender } = await render(<Toast message="Saved" />);
		for (const tone of ["success", "warning", "error"] as const) {
			expect(screen.queryByTestId(`toast-${tone}-marker`)).toBeNull();
			await rerender(<Toast message="Saved" tone={tone} />);
			expect(screen.getByTestId(`toast-${tone}-marker`)).toBeTruthy();
			await rerender(<Toast message="Saved" />);
		}
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
