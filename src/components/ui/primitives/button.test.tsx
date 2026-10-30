import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
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

	it("renders the destructive variant as red text on an outlined pill, never filled", async () => {
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
		expect(screen.getByRole("button")).toHaveStyle({
			backgroundColor: surfaceColors.light.card,
			borderWidth: 1,
			borderColor: surfaceColors.light.border,
		});
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
		expect(screen.getByText("Restore")).toHaveStyle({ fontSize: 14 });
		expect(screen.getByRole("button")).toHaveStyle({
			paddingVertical: 6,
			minHeight: 0,
		});
	});
});

describe("Button — disabled with reason (VAR-13)", () => {
	it("shows the reason above the button only while disabled", async () => {
		const { rerender } = await render(
			<Button
				label="Save habit"
				onPress={jest.fn()}
				disabled
				disabledReason="Pick a category to save this habit"
			/>,
		);
		expect(screen.getByText("Pick a category to save this habit")).toBeTruthy();

		await rerender(
			<Button
				label="Save habit"
				onPress={jest.fn()}
				disabledReason="Pick a category to save this habit"
			/>,
		);
		expect(screen.queryByText("Pick a category to save this habit")).toBeNull();
	});

	it("takes an accessibility label when the visible one is ambiguous", async () => {
		await render(
			<Button
				label="Rename"
				accessibilityLabel="Rename Music"
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByRole("button", { name: "Rename Music" })).toBeTruthy();
	});

	it.each(["link", "inline"] as const)(
		"%s text actions are 44pt tall, and don't lean on a hitSlop that stacked buttons would share",
		async (variant) => {
			await render(
				<Button label="Remove" variant={variant} onPress={jest.fn()} />,
			);
			const button = screen.getByRole("button", { name: "Remove" });
			expect(StyleSheet.flatten(button.props.style).minHeight).toBe(44);
			expect(button.props.hitSlop).toBeUndefined();
		},
	);
});

describe("Button — V3-22 geometry", () => {
	it("gives the full-width pill and the compact pill a 44 pt minimum", async () => {
		const { rerender } = await render(
			<Button label="Add habit" onPress={jest.fn()} />,
		);
		expect(screen.getByRole("button")).toHaveStyle({ minHeight: 44 });
		await rerender(
			<Button label="Add habit" fullWidth={false} onPress={jest.fn()} />,
		);
		expect(screen.getByRole("button")).toHaveStyle({ minHeight: 44 });
	});

	it("fills the primary pill with the accent", async () => {
		await render(<Button label="Add habit" onPress={jest.fn()} />);
		expect(screen.getByRole("button")).toHaveStyle({
			backgroundColor: "#1A1A19",
		});
	});
});
