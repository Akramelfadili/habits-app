import { fireEvent, render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
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

	it("renders an inline action in ink, flush-left", async () => {
		const onPress = jest.fn();
		await render(
			<Button
				label="Reschedule habit →"
				variant="inline"
				fullWidth={false}
				onPress={onPress}
			/>,
		);

		expect(screen.getByText("Reschedule habit →")).toHaveStyle({
			color: surfaceColors.light.ink,
		});
		expect(screen.getByRole("button")).toHaveStyle({ alignSelf: "flex-start" });
		await fireEvent.press(screen.getByText("Reschedule habit →"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("renders the destructive variant as red text with no fill", async () => {
		const onPress = jest.fn();
		await render(
			<Button
				label="Delete permanently"
				variant="destructive"
				onPress={onPress}
			/>,
		);

		const label = screen.getByText("Delete permanently");
		expect(label).toHaveStyle({ color: semanticColors.light.dangerBg });
		await fireEvent.press(label);
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("shrinks the pill and its label at the small size", async () => {
		await render(
			<Button
				label="Restore"
				variant="secondary"
				size="small"
				fullWidth={false}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByText("Restore")).toHaveStyle({ fontSize: 13 });
		expect(screen.getByRole("button")).toHaveStyle({ paddingVertical: 6 });
	});
});
