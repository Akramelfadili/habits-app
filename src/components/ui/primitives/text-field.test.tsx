import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { semanticColors } from "@/theme/theme";
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

	it("shows a character counter only near the cap", async () => {
		const { rerender } = await render(
			<TextField
				label="Note"
				value="short"
				onChangeText={() => {}}
				maxLength={280}
			/>,
		);
		expect(screen.queryByText(/\/280$/)).toBeNull();

		await rerender(
			<TextField
				label="Note"
				value={"a".repeat(250)}
				onChangeText={() => {}}
				maxLength={280}
			/>,
		);
		expect(screen.getByText("250/280")).toBeTruthy();
	});

	it("passes the cap and multiline through to the input", async () => {
		await render(
			<TextField
				label="Note"
				value=""
				onChangeText={() => {}}
				maxLength={280}
				multiline
			/>,
		);
		const input = screen.getByDisplayValue("");
		expect(input.props.maxLength).toBe(280);
		expect(input.props.multiline).toBe(true);
	});
});

describe("TextField — near-limit name field (VAR-12)", () => {
	it("trims pasted text to the limit instead of rejecting it", async () => {
		const onChangeText = jest.fn();
		await render(
			<TextField
				label="Name"
				value=""
				onChangeText={onChangeText}
				maxLength={20}
				nearLimitCounter
			/>,
		);
		await fireEvent.changeText(
			screen.getByDisplayValue(""),
			"A pasted name that is far too long",
		);
		expect(onChangeText).toHaveBeenCalledWith("A pasted name that i");
	});

	it("shows the NEW-23 counter from 80% only, never the legacy one", async () => {
		const { rerender } = await render(
			<TextField
				label="Name"
				value={"x".repeat(15)}
				onChangeText={jest.fn()}
				maxLength={20}
				nearLimitCounter
			/>,
		);
		expect(screen.queryByText(/\/20$/)).toBeNull();

		await rerender(
			<TextField
				label="Name"
				value={"x".repeat(16)}
				onChangeText={jest.fn()}
				maxLength={20}
				nearLimitCounter
			/>,
		);
		expect(screen.getByText("16/20")).toBeTruthy();
	});

	it("outlines a warning in amber with the helper under the field", async () => {
		await render(
			<TextField
				label="Name"
				value="Fitness"
				onChangeText={jest.fn()}
				warning="You already have Fitness. Pick it from the list instead."
			/>,
		);
		expect(borderColor()).toBe(semanticColors.light.warnInk);
		expect(
			screen.getByText(
				"You already have Fitness. Pick it from the list instead.",
			),
		).toBeTruthy();
	});

	it("calls onSubmitEditing on the return key", async () => {
		const onSubmitEditing = jest.fn();
		await render(
			<TextField
				label="Name"
				value="Piano"
				onChangeText={jest.fn()}
				onSubmitEditing={onSubmitEditing}
			/>,
		);
		await fireEvent(screen.getByLabelText("Name"), "submitEditing");
		expect(onSubmitEditing).toHaveBeenCalled();
	});
});
