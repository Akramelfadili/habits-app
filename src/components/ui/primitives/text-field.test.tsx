import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TextField } from "./text-field";

const borderColor = () =>
	StyleSheet.flatten(screen.getByTestId("text-field").props.style).borderColor;

describe("TextField", () => {
	it("calls onChangeText as the user types", async () => {
		const onChangeText = jest.fn();
		await render(
			<TextField label="Name" value="" onChangeText={onChangeText} />,
		);

		await fireEvent.changeText(screen.getByDisplayValue(""), "Gym");
		expect(onChangeText).toHaveBeenCalledWith("Gym");
	});

	it("shows the inline error message when one is passed", async () => {
		await render(
			<TextField
				label="Name"
				value=""
				onChangeText={jest.fn()}
				error="Give this habit a name."
			/>,
		);
		expect(screen.getByText("Give this habit a name.")).toBeTruthy();
	});

	it("renders no error text when none is passed", async () => {
		await render(
			<TextField label="Name" value="Gym" onChangeText={jest.fn()} />,
		);
		expect(screen.queryByText(/give this habit a name/i)).toBeNull();
	});

	it("outlines the field while focused and still forwards onFocus/onBlur", async () => {
		const onFocus = jest.fn();
		const onBlur = jest.fn();
		await render(
			<TextField
				label="Name"
				value="Gym"
				onChangeText={jest.fn()}
				onFocus={onFocus}
				onBlur={onBlur}
			/>,
		);
		expect(borderColor()).toBe("transparent");

		await fireEvent(screen.getByDisplayValue("Gym"), "focus");
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(borderColor()).not.toBe("transparent");

		await fireEvent(screen.getByDisplayValue("Gym"), "blur");
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(borderColor()).toBe("transparent");
	});

	it("keeps the error outline while focused", async () => {
		await render(
			<TextField
				label="Name"
				value=""
				onChangeText={jest.fn()}
				error="Give this habit a name."
			/>,
		);
		const errorColor = borderColor();

		await fireEvent(screen.getByDisplayValue(""), "focus");
		expect(borderColor()).toBe(errorColor);
	});
});
