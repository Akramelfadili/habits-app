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

	describe("adjustable (A6-06)", () => {
		it("exposes the value as an adjustable with its range", async () => {
			await renderStepper(3);
			const value = screen.getByRole("adjustable", { name: "times per week" });
			expect(value.props.accessibilityValue).toEqual({
				min: 1,
				max: 7,
				now: 3,
			});
		});

		it("steps up and down from the screen reader's increment/decrement, within bounds", async () => {
			const onChange = jest.fn();
			await renderStepper(3, onChange);
			const value = screen.getByRole("adjustable", { name: "times per week" });

			await fireEvent(value, "accessibilityAction", {
				nativeEvent: { actionName: "increment" },
			});
			expect(onChange).toHaveBeenLastCalledWith(4);
			await fireEvent(value, "accessibilityAction", {
				nativeEvent: { actionName: "decrement" },
			});
			expect(onChange).toHaveBeenLastCalledWith(2);
		});

		it("does not step past the minimum or maximum", async () => {
			const onChange = jest.fn();
			await renderStepper(1, onChange);
			await fireEvent(
				screen.getByRole("adjustable", { name: "times per week" }),
				"accessibilityAction",
				{ nativeEvent: { actionName: "decrement" } },
			);
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	it("shows its unit or target under the value (V3-18)", async () => {
		await render(
			<Stepper
				value={8}
				onChange={jest.fn()}
				min={1}
				max={99}
				accessibilityLabel="daily target"
				caption="glasses a day"
			/>,
		);
		expect(screen.getByText("8")).toBeTruthy();
		expect(screen.getByText("glasses a day")).toBeTruthy();
	});
});
