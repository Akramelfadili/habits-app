import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { type QueuedReminder, ReminderDrafts } from "./reminder-drafts";

const queued: QueuedReminder[] = [
	{ key: 1, hour: 7, minute: 0, weekdays: [2, 4] },
	{ key: 2, hour: 18, minute: 30, weekdays: [1, 2, 3, 4, 5, 6, 7] },
];

function setup(reminders: QueuedReminder[]) {
	const handlers = { onAdd: jest.fn(), onEdit: jest.fn(), onRemove: jest.fn() };
	return {
		...handlers,
		view: render(<ReminderDrafts reminders={reminders} {...handlers} />),
	};
}

describe("ReminderDrafts", () => {
	it("with none queued: just Add time and the 24-hour note", async () => {
		const { view } = setup([]);
		await view;
		expect(screen.getByLabelText("Add time")).toBeTruthy();
		expect(
			screen.getByText("24-hour times. Each time can repeat on its own days."),
		).toBeTruthy();
	});

	it("lists each time with its own days, each readable as one line", async () => {
		const { view } = setup(queued);
		await view;
		expect(screen.getByLabelText("07:00, Tue, Thu")).toBeTruthy();
		expect(screen.getByLabelText("18:30, Every day")).toBeTruthy();
	});

	it("removes from the minus on the left, edits from the row, adds from Add time", async () => {
		const { onAdd, onEdit, onRemove, view } = setup(queued);
		await view;
		await fireEvent.press(screen.getByLabelText("Remove reminder at 07:00"));
		expect(onRemove).toHaveBeenCalledWith(queued[0]);
		await fireEvent.press(screen.getByLabelText("07:00, Tue, Thu"));
		expect(onEdit).toHaveBeenCalledWith(queued[0]);
		await fireEvent.press(screen.getByLabelText("Add time"));
		expect(onAdd).toHaveBeenCalledTimes(1);
	});

	it("turns Add time off at four, and says why", async () => {
		const four = [1, 2, 3, 4].map((key) => ({
			key,
			hour: key,
			minute: 0,
			weekdays: [1 as const],
		}));
		const { view } = setup(four);
		await view;
		expect(
			screen.getByLabelText("Add time").props.accessibilityState.disabled,
		).toBe(true);
		expect(screen.getByText(/remove one to add another/)).toBeTruthy();
	});
});
