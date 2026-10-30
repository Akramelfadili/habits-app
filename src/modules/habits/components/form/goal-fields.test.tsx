import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

import { GoalFields } from "./goal-fields";

function setup(overrides: Partial<Parameters<typeof GoalFields>[0]> = {}) {
	const handlers = {
		onTargetType: jest.fn(),
		onTargetAmount: jest.fn(),
		onTargetUnit: jest.fn(),
		onUnitBlur: jest.fn(),
	};
	const props = {
		direction: "build" as const,
		targetType: "simple" as const,
		targetAmount: 8,
		targetUnit: "",
		...handlers,
		...overrides,
	};
	return { ...handlers, view: render(<GoalFields {...props} />) };
}

describe("GoalFields", () => {
	it("Check shows only the segmented control", async () => {
		const { view } = setup();
		await view;
		expect(screen.getByText("Check")).toBeTruthy();
		expect(screen.queryByText("DAILY TARGET")).toBeNull();
		expect(screen.queryByLabelText("Unit")).toBeNull();
	});

	it("reports the chosen goal", async () => {
		const { onTargetType, view } = setup();
		await view;
		await fireEvent.press(screen.getByText("Quantity"));
		expect(onTargetType).toHaveBeenCalledWith("quantity");
	});

	it("Quantity: target stepper with its caption, unit field and the live example", async () => {
		const { onTargetAmount, view } = setup({
			targetType: "quantity",
			targetUnit: "glasses",
		});
		await view;
		expect(screen.getByText("glasses a day")).toBeTruthy();
		expect(
			screen.getByText("Shown after the number: 5 of 8 glasses"),
		).toBeTruthy();
		await fireEvent.press(screen.getByLabelText("Decrease daily target"));
		expect(onTargetAmount).toHaveBeenCalledWith(7);
	});

	it("keeps the example sensible for a small target", async () => {
		const { view } = setup({
			targetType: "quantity",
			targetAmount: 1,
			targetUnit: "walk",
		});
		await view;
		expect(
			screen.getByText("Shown after the number: 1 of 1 walk"),
		).toBeTruthy();
	});

	it("shows the unit error as an alert and reports blur", async () => {
		const { onUnitBlur, view } = setup({
			targetType: "quantity",
			unitError: "Give this target a unit, e.g. “glasses”.",
		});
		await view;
		expect(screen.getByRole("alert")).toBeTruthy();
		await fireEvent(screen.getByLabelText("Unit"), "blur");
		expect(onUnitBlur).toHaveBeenCalled();
	});

	it("Break: Quantity is off with its reason, and no target fields show", async () => {
		const { view } = setup({ direction: "break", targetType: "quantity" });
		await view;
		expect(
			screen.getByText("Break habits are yes or no, so Quantity is off."),
		).toBeTruthy();
		expect(screen.queryByText("DAILY TARGET")).toBeNull();
	});
});
