import { fireEvent, render, screen } from "@testing-library/react-native";
import { Stepper } from "./stepper";

function renderStepper(value: number, onChange = jest.fn()) {
	return render(
		<Stepper
			value={value}
			onChange={onChange}
			min={1}
			max={7}
			accessibilityLabel="times per week"
		/>,
	);
}

describe("Stepper", () => {
	it("shows the value and steps it up and down by one", async () => {
		const onChange = jest.fn();
		await renderStepper(3, onChange);

		expect(screen.getByText("3")).toBeTruthy();
		await fireEvent.press(screen.getByLabelText("Increase times per week"));
		expect(onChange).toHaveBeenLastCalledWith(4);
		await fireEvent.press(screen.getByLabelText("Decrease times per week"));
		expect(onChange).toHaveBeenLastCalledWith(2);
	});

	it("disables decrease at the minimum", async () => {
		const onChange = jest.fn();
		await renderStepper(1, onChange);

		await fireEvent.press(screen.getByLabelText("Decrease times per week"));
		expect(onChange).not.toHaveBeenCalled();
	});

	it("disables increase at the maximum", async () => {
		const onChange = jest.fn();
		await renderStepper(7, onChange);

		await fireEvent.press(screen.getByLabelText("Increase times per week"));
		expect(onChange).not.toHaveBeenCalled();
	});
});
