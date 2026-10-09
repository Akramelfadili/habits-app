import { fireEvent, render, screen } from "@testing-library/react-native";
import { WeekdayPicker } from "./weekday-picker";

const days = [
	{ day: 1, letter: "M", name: "Monday" },
	{ day: 2, letter: "T", name: "Tuesday" },
	{ day: 3, letter: "W", name: "Wednesday" },
];

describe("WeekdayPicker", () => {
	it("marks selected days", async () => {
		await render(
			<WeekdayPicker days={days} selected={[1, 3]} onChange={jest.fn()} />,
		);

		const selected = (name: string) =>
			screen.getByLabelText(name).props.accessibilityState.checked;
		expect([
			selected("Monday"),
			selected("Tuesday"),
			selected("Wednesday"),
		]).toEqual([true, false, true]);
	});

	it("adds an unselected day when tapped", async () => {
		const onChange = jest.fn();
		await render(
			<WeekdayPicker days={days} selected={[1]} onChange={onChange} />,
		);

		await fireEvent.press(screen.getByLabelText("Tuesday"));
		expect(onChange).toHaveBeenCalledWith([1, 2]);
	});

	it("removes a selected day when tapped", async () => {
		const onChange = jest.fn();
		await render(
			<WeekdayPicker days={days} selected={[1, 3]} onChange={onChange} />,
		);

		await fireEvent.press(screen.getByLabelText("Monday"));
		expect(onChange).toHaveBeenCalledWith([3]);
	});

	it("ignores taps when disabled", async () => {
		const onChange = jest.fn();
		await render(
			<WeekdayPicker days={days} selected={[]} onChange={onChange} disabled />,
		);

		await fireEvent.press(screen.getByLabelText("Monday"));
		expect(onChange).not.toHaveBeenCalled();
	});
});
