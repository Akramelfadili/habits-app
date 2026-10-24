import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
import { QuantityLogSheet } from "./quantity-log-sheet";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const habit = makeHabit({
	name: "Glass of water",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
	frequency: { type: "daily" },
});

describe("QuantityLogSheet", () => {
	it("the habit's name is the sheet's heading and wraps rather than overflowing (A6-09, A5-15)", async () => {
		await render(
			<QuantityLogSheet
				visible
				habit={habit}
				value={6}
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		const heading = screen.getByRole("header", { name: "Glass of water" });
		expect(heading.props.numberOfLines).toBe(2);
		expect(
			screen.getByText("Target 8 glasses · daily").props.numberOfLines,
		).toBe(2);
	});

	it("renders the habit's name and target", async () => {
		await render(
			<QuantityLogSheet
				visible
				habit={habit}
				value={6}
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		expect(screen.getByText("Glass of water")).toBeTruthy();
		expect(screen.getByText("Target 8 glasses · daily")).toBeTruthy();
	});

	it("starts the draft from the current value", async () => {
		await render(
			<QuantityLogSheet
				visible
				habit={habit}
				value={6}
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		expect(screen.getByText("Save 6 of 8")).toBeTruthy();
	});

	it("the stepper's + button increments the draft, reflected in the Save label", async () => {
		await render(
			<QuantityLogSheet
				visible
				habit={habit}
				value={6}
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		await fireEvent.press(
			screen.getByLabelText("Increase Glass of water, glasses"),
		);
		expect(screen.getByText("Save 7 of 8")).toBeTruthy();
	});

	it("the stepper cannot go below 0", async () => {
		await render(
			<QuantityLogSheet
				visible
				habit={habit}
				value={0}
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		expect(
			screen.getByLabelText("Decrease Glass of water, glasses").props
				.accessibilityState.disabled,
		).toBe(true);
	});

	it("a quick-add chip adds to the draft", async () => {
		await render(
			<QuantityLogSheet
				visible
				habit={habit}
				value={6}
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		await fireEvent.press(screen.getByText("+2"));
		expect(screen.getByText("Save 8 of 8")).toBeTruthy();
	});

	it("the Full-target chip jumps straight to the target, not adds to it", async () => {
		await render(
			<QuantityLogSheet
				visible
				habit={habit}
				value={3}
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		await fireEvent.press(screen.getByText("Full 8"));
		expect(screen.getByText("Save 8 of 8")).toBeTruthy();
	});

	it("allows the draft to go past the target — over-logging isn't capped", async () => {
		await render(
			<QuantityLogSheet
				visible
				habit={habit}
				value={8}
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		await fireEvent.press(
			screen.getByLabelText("Increase Glass of water, glasses"),
		);
		expect(screen.getByText("Save 9 of 8")).toBeTruthy();
	});

	it("shows how far over target the draft is once it passes 100%", async () => {
		await render(
			<QuantityLogSheet
				visible
				habit={habit}
				value={8}
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		await fireEvent.press(
			screen.getByLabelText("Increase Glass of water, glasses"),
		);
		await fireEvent.press(
			screen.getByLabelText("Increase Glass of water, glasses"),
		);
		expect(screen.getByText("+2 over")).toBeTruthy();
	});

	it("shows no overflow indicator at or below target", async () => {
		await render(
			<QuantityLogSheet
				visible
				habit={habit}
				value={8}
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		expect(screen.queryByText(/over$/)).toBeNull();
	});

	it("Save calls onSave with the current draft value", async () => {
		const onSave = jest.fn();
		await render(
			<QuantityLogSheet
				visible
				habit={habit}
				value={6}
				onDismiss={jest.fn()}
				onSave={onSave}
			/>,
		);
		await fireEvent.press(
			screen.getByLabelText("Increase Glass of water, glasses"),
		);
		await fireEvent.press(screen.getByText("Save 7 of 8"));
		expect(onSave).toHaveBeenCalledWith(7);
	});

	it("dismissing the scrim calls onDismiss without saving", async () => {
		const onDismiss = jest.fn();
		const onSave = jest.fn();
		await render(
			<QuantityLogSheet
				visible
				habit={habit}
				value={6}
				onDismiss={onDismiss}
				onSave={onSave}
			/>,
		);
		await fireEvent.press(screen.getByLabelText("Dismiss"));
		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(onSave).not.toHaveBeenCalled();
	});
});
