import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { ReminderRow } from "./reminder-row";

const reminder = { hour: 18, minute: 30, weekdays: [4 as const] };

describe("ReminderRow", () => {
	it("reads the time and its own days as one line", async () => {
		await render(
			<ReminderRow
				reminder={reminder}
				onEdit={jest.fn()}
				onRemove={jest.fn()}
			/>,
		);
		expect(screen.getByLabelText("18:30, Thu")).toBeTruthy();
		expect(screen.getByText("18:30")).toBeTruthy();
		expect(screen.getByText("Thu")).toBeTruthy();
	});

	it("removes from the minus on the left and edits from the row", async () => {
		const onEdit = jest.fn();
		const onRemove = jest.fn();
		await render(
			<ReminderRow reminder={reminder} onEdit={onEdit} onRemove={onRemove} />,
		);
		await fireEvent.press(screen.getByLabelText("Remove reminder at 18:30"));
		expect(onRemove).toHaveBeenCalledTimes(1);
		await fireEvent.press(screen.getByLabelText("18:30, Thu"));
		expect(onEdit).toHaveBeenCalledTimes(1);
	});

	it("says Off for a reminder stored as off, in words as well as on the row", async () => {
		await render(
			<ReminderRow
				reminder={reminder}
				off
				onEdit={jest.fn()}
				onRemove={jest.fn()}
			/>,
		);
		expect(screen.getByLabelText("18:30, Thu · Off")).toBeTruthy();
	});

	it("the row is a button that says what it opens, and the minus is its own stop (08.3)", async () => {
		await render(
			<ReminderRow
				reminder={reminder}
				onEdit={jest.fn()}
				onRemove={jest.fn()}
			/>,
		);
		const row = screen.getByRole("button", { name: "18:30, Thu" });
		expect(row.props.accessibilityHint).toBe("Opens its time and days.");
		expect(
			screen.getByRole("button", { name: "Remove reminder at 18:30" }),
		).toBeTruthy();
	});
});
