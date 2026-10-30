import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

import { FrequencyFields } from "./frequency-fields";

function setup(overrides: Partial<Parameters<typeof FrequencyFields>[0]> = {}) {
	const handlers = {
		onFrequencyType: jest.fn(),
		onWeekdays: jest.fn(),
		onTimesPerWeek: jest.fn(),
	};
	const props = {
		frequencyType: "daily" as const,
		weekdays: [],
		timesPerWeek: 3,
		noDaysError: false,
		...handlers,
		...overrides,
	};
	return { ...handlers, view: render(<FrequencyFields {...props} />) };
}

describe("FrequencyFields", () => {
	it("offers exactly Daily, Specific days and × per week", async () => {
		await setup().view;
		expect(
			screen.getAllByRole("button").map((chip) => chip.props.children),
		).toBeDefined();
		for (const label of ["Daily", "Specific days", "× per week"]) {
			expect(screen.getByText(label)).toBeTruthy();
		}
		expect(screen.queryByText("Weekdays")).toBeNull();
	});

	it("reports a change of mode", async () => {
		const { onFrequencyType, view } = setup();
		await view;
		await fireEvent.press(screen.getByText("× per week"));
		expect(onFrequencyType).toHaveBeenCalledWith("per-week");
	});

	it("Specific days: seven weekday chips, toggling one reports the new set", async () => {
		const { onWeekdays, view } = setup({
			frequencyType: "weekdays",
			weekdays: [2],
		});
		await view;
		expect(screen.getAllByRole("checkbox")).toHaveLength(7);
		expect(
			screen.getByLabelText("Tuesday").props.accessibilityState.checked,
		).toBe(true);
		await fireEvent.press(screen.getByLabelText("Thursday"));
		expect(onWeekdays).toHaveBeenCalledWith([2, 4]);
	});

	it("shows the no-days error as an alert only when asked", async () => {
		const { view } = setup({ frequencyType: "weekdays", noDaysError: true });
		await view;
		expect(
			screen.getByRole("alert", { name: "Pick at least one day" }),
		).toBeTruthy();
	});

	it("× per week: a stepper, the caption and the Monday–Sunday rule for the count", async () => {
		const { onTimesPerWeek, view } = setup({
			frequencyType: "per-week",
			timesPerWeek: 5,
		});
		await view;
		expect(screen.getByText("times a week")).toBeTruthy();
		expect(
			screen.getByText(
				"Weeks run Monday to Sunday. Once you reach 5, it leaves Today until the next week starts.",
			),
		).toBeTruthy();
		await fireEvent.press(screen.getByLabelText("Increase times per week"));
		expect(onTimesPerWeek).toHaveBeenCalledWith(6);
	});
});
