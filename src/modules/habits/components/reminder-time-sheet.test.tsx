import { fireEvent, render, screen } from "@testing-library/react-native";

const mockTimeWheel = jest.fn();
jest.mock("@/components/ui/primitives/time-wheel", () => ({
	TimeWheel: (props: unknown) => {
		mockTimeWheel(props);
		return null;
	},
}));

import { ReminderTimeSheet } from "./reminder-time-sheet";

describe("ReminderTimeSheet", () => {
	beforeEach(() => mockTimeWheel.mockClear());

	it("stays closed without a time", async () => {
		await render(
			<ReminderTimeSheet
				time={null}
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		expect(screen.queryByText("Save time")).toBeNull();
	});

	it("saves the time picked on the wheel", async () => {
		const onSave = jest.fn();
		await render(
			<ReminderTimeSheet
				time={{ hour: 7, minute: 20 }}
				onDismiss={jest.fn()}
				onSave={onSave}
			/>,
		);

		const wheel = mockTimeWheel.mock.calls.at(-1)[0];
		expect(wheel).toEqual(expect.objectContaining({ hour: 7, minute: 20 }));

		await fireEvent(screen.getByText("Save time"), "press");
		// Unchanged wheel → saves the opening time.
		expect(onSave).toHaveBeenCalledWith({ hour: 7, minute: 20 });
	});

	it("Cancel dismisses without saving", async () => {
		const onDismiss = jest.fn();
		const onSave = jest.fn();
		await render(
			<ReminderTimeSheet
				time={{ hour: 7, minute: 20 }}
				onDismiss={onDismiss}
				onSave={onSave}
			/>,
		);

		await fireEvent.press(screen.getByText("Cancel"));
		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(onSave).not.toHaveBeenCalled();
	});
});
