import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
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
		expect(borderColor()).toBe(surfaceColors.light.border);

		await fireEvent(screen.getByDisplayValue("Gym"), "focus");
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(borderColor()).toBe(surfaceColors.light.accent);

		await fireEvent(screen.getByDisplayValue("Gym"), "blur");
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(borderColor()).toBe(surfaceColors.light.border);
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
		expect(borderColor()).toBe(semanticColors.light.dangerBg);

		await fireEvent(screen.getByDisplayValue(""), "focus");
		expect(borderColor()).toBe(semanticColors.light.dangerBg);
	});

	it("shows the counter from 80 % of the cap only", async () => {
		const { rerender } = await render(
			<TextField
				label="Note"
				value="short"
				onChangeText={() => {}}
				maxLength={280}
			/>,
		);
		expect(screen.queryByText(/ \/ 280$/)).toBeNull();

		await rerender(
			<TextField
				label="Note"
				value={"a".repeat(224)}
				onChangeText={() => {}}
				maxLength={280}
			/>,
		);
		expect(screen.getByText("224 / 280")).toBeTruthy();
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
			/>,
		);
		await fireEvent.changeText(
			screen.getByDisplayValue(""),
			"A pasted name that is far too long",
		);
		expect(onChangeText).toHaveBeenCalledWith("A pasted name that i");
	});

	it("never cuts a value already over the limit when it's edited", async () => {
		const onChangeText = jest.fn();
		const legacy = "a".repeat(38);
		await render(
			<TextField
				label="Name"
				value={legacy}
				onChangeText={onChangeText}
				maxLength={32}
			/>,
		);
		await fireEvent.changeText(
			screen.getByDisplayValue(legacy),
			"a".repeat(37),
		);
		expect(onChangeText).toHaveBeenCalledWith("a".repeat(37));
		expect(screen.getByText("38 / 32")).toBeTruthy();
	});

	it("shows the NEW-23 counter from 80% only, never the legacy one", async () => {
		const { rerender } = await render(
			<TextField
				label="Name"
				value={"x".repeat(15)}
				onChangeText={jest.fn()}
				maxLength={20}
			/>,
		);
		expect(screen.queryByText(/ \/ 20$/)).toBeNull();

		await rerender(
			<TextField
				label="Name"
				value={"x".repeat(16)}
				onChangeText={jest.fn()}
				maxLength={20}
			/>,
		);
		expect(screen.getByText("16 / 20")).toBeTruthy();
	});

	it("draws a duplicate-name error in danger with the message under the card (F8)", async () => {
		await render(
			<TextField
				label="Name"
				value="Read 20 min"
				onChangeText={jest.fn()}
				error="You already have a habit called Read 20 min. Choose another name."
			/>,
		);
		expect(borderColor()).toBe(semanticColors.light.dangerBg);
		expect(
			screen.getByRole("alert", {
				name: "You already have a habit called Read 20 min. Choose another name.",
			}),
		).toBeTruthy();
	});

	it("shows a helper under the card when nothing is wrong", async () => {
		await render(
			<TextField
				label="Unit"
				value="glasses"
				onChangeText={jest.fn()}
				helper="Shown after the number: 5 of 8 glasses"
			/>,
		);
		expect(
			screen.getByText("Shown after the number: 5 of 8 glasses"),
		).toBeTruthy();
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("says the limit in amber at the cap, and the error outranks it", async () => {
		const limit = (n: number) => `${n} characters max`;
		const { rerender } = await render(
			<TextField
				label="Name"
				value={"x".repeat(32)}
				onChangeText={jest.fn()}
				maxLength={32}
				limitMessage={limit}
			/>,
		);
		expect(screen.getByText("32 characters max")).toHaveStyle({
			color: semanticColors.light.warnInk,
		});
		expect(screen.getByText("32 / 32")).toHaveStyle({
			color: semanticColors.light.warnInk,
		});

		await rerender(
			<TextField
				label="Name"
				value={"x".repeat(32)}
				onChangeText={jest.fn()}
				maxLength={32}
				limitMessage={limit}
				error="Taken."
			/>,
		);
		expect(screen.queryByText("32 characters max")).toBeNull();
		expect(screen.getByText("Taken.")).toBeTruthy();
	});

	it("locks the input and shows its reason when disabled", async () => {
		await render(
			<TextField
				label="Category name"
				value="Fitness"
				onChangeText={jest.fn()}
				disabled
				helper="Built-in categories can’t be renamed"
				maxLength={20}
			/>,
		);
		expect(screen.getByLabelText("Category name").props.editable).toBe(false);
		expect(
			screen.getByText("Built-in categories can’t be renamed"),
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

	it("announces its error as an alert to screen readers (A6-17)", async () => {
		await render(
			<TextField
				label="Name"
				value=""
				onChangeText={jest.fn()}
				error="Give this habit a name."
			/>,
		);
		expect(
			screen.getByRole("alert", { name: "Give this habit a name." }),
		).toBeTruthy();
	});

	it("shows 'Next' and keeps the keyboard up when Return hands focus on", async () => {
		await render(
			<TextField
				label="Name"
				value="Piano"
				onChangeText={jest.fn()}
				returnKeyType="next"
				onSubmitEditing={jest.fn()}
			/>,
		);
		const input = screen.getByLabelText("Name");
		expect(input.props.returnKeyType).toBe("next");
		expect(input.props.submitBehavior).toBe("submit");
	});

	it("defaults to 'Done' when it has a submit handler, and no key label otherwise", async () => {
		const { rerender } = await render(
			<TextField label="Name" value="" onChangeText={jest.fn()} />,
		);
		expect(screen.getByLabelText("Name").props.returnKeyType).toBeUndefined();
		await rerender(
			<TextField
				label="Name"
				value=""
				onChangeText={jest.fn()}
				onSubmitEditing={jest.fn()}
			/>,
		);
		expect(screen.getByLabelText("Name").props.returnKeyType).toBe("done");
	});
});
