import { fireEvent, render, screen } from "@testing-library/react-native";
import { Button } from "./button";

describe("Button", () => {
	it("calls onPress when tapped", async () => {
		const onPress = jest.fn();
		await render(<Button label="Save habit" onPress={onPress} />);

		await fireEvent.press(screen.getByText("Save habit"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("does not call onPress when disabled", async () => {
		const onPress = jest.fn();
		await render(<Button label="Save habit" onPress={onPress} disabled />);

		await fireEvent.press(screen.getByText("Save habit"));
		expect(onPress).not.toHaveBeenCalled();
	});

	it("shows a spinner instead of the label while loading, and blocks presses", async () => {
		const onPress = jest.fn();
		await render(<Button label="Save habit" onPress={onPress} loading />);

		expect(screen.queryByText("Save habit")).toBeNull();
		expect(screen.getByRole("button").props.accessibilityState.busy).toBe(true);
	});

	it("calls onPress when tapped as a compact, non-full-width button", async () => {
		const onPress = jest.fn();
		await render(
			<Button
				label="Cancel"
				variant="ghost"
				fullWidth={false}
				onPress={onPress}
			/>,
		);

		await fireEvent.press(screen.getByText("Cancel"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("calls onPress when tapped as a link", async () => {
		const onPress = jest.fn();
		await render(
			<Button
				label="Start from scratch"
				variant="link"
				fullWidth={false}
				onPress={onPress}
			/>,
		);

		await fireEvent.press(screen.getByText("Start from scratch"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});
});
