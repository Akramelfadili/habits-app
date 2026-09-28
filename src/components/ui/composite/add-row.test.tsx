import { fireEvent, render, screen } from "@testing-library/react-native";
import { AddRow } from "./add-row";

describe("AddRow", () => {
	it("shows its label and count, and presses", async () => {
		const onPress = jest.fn();
		await render(
			<AddRow label="Add a time" count="3 of 4" onPress={onPress} />,
		);

		expect(screen.getByText("Add a time")).toBeTruthy();
		expect(screen.getByText("3 of 4")).toBeTruthy();
		await fireEvent.press(
			screen.getByRole("button", { name: "Add a time, 3 of 4" }),
		);
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("is inert when disabled", async () => {
		const onPress = jest.fn();
		await render(
			<AddRow label="Add a time" count="4 of 4" onPress={onPress} disabled />,
		);

		const row = screen.getByRole("button");
		expect(row).toBeDisabled();
		await fireEvent.press(row);
		expect(onPress).not.toHaveBeenCalled();
	});
});
