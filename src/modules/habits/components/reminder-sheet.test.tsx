import { act, fireEvent, render, screen } from "@testing-library/react-native";

const mockTimeWheel = jest.fn();
jest.mock("@/components/ui/primitives/time-wheel", () => ({
	TimeWheel: (props: { onChange: (t: unknown) => void }) => {
		mockTimeWheel(props);
		return null;
	},
}));
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

import { ReminderSheet } from "./reminder-sheet";

const draft = { hour: 9, minute: 0, weekdays: [1, 2, 3, 4, 5, 6, 7] as const };

describe("ReminderSheet", () => {
	beforeEach(() => mockTimeWheel.mockClear());

	it("stays closed without a draft", async () => {
		await render(
			<ReminderSheet
				draft={null}
				title="Add time"
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		expect(screen.queryByText("Save time")).toBeNull();
	});

	it("opens on the given time and days, titled by the caller", async () => {
		await render(
			<ReminderSheet
				draft={{ ...draft, weekdays: [...draft.weekdays] }}
				title="Add time"
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		expect(screen.getByText("Add time")).toBeTruthy();
		expect(mockTimeWheel.mock.calls.at(-1)?.[0]).toMatchObject({
			hour: 9,
			minute: 0,
		});
		expect(screen.getAllByRole("checkbox")).toHaveLength(7);
	});

	it("saves the time picked and the days toggled", async () => {
		const onSave = jest.fn();
		await render(
			<ReminderSheet
				draft={{ hour: 9, minute: 0, weekdays: [1, 2] }}
				title="Reminder time"
				onDismiss={jest.fn()}
				onSave={onSave}
			/>,
		);
		const wheel = mockTimeWheel.mock.calls.at(-1)?.[0];
		await fireEvent.press(screen.getByLabelText("Wednesday"));
		await act(async () => wheel.onChange({ hour: 6, minute: 45 }));
		await fireEvent.press(screen.getByText("Save time"));
		expect(onSave).toHaveBeenCalledWith({
			hour: 6,
			minute: 45,
			weekdays: [1, 2, 3],
		});
	});

	it("blocks Save with no days, saying so", async () => {
		await render(
			<ReminderSheet
				draft={{ hour: 9, minute: 0, weekdays: [1] }}
				title="Add time"
				onDismiss={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		await fireEvent.press(screen.getByLabelText("Monday"));
		expect(screen.getByText("Pick at least one day")).toBeTruthy();
		expect(
			screen.getByText("Save time").parent?.props.accessibilityState.disabled,
		).toBe(true);
	});

	it("Cancel dismisses without saving", async () => {
		const onDismiss = jest.fn();
		const onSave = jest.fn();
		await render(
			<ReminderSheet
				draft={{ hour: 9, minute: 0, weekdays: [1] }}
				title="Add time"
				onDismiss={onDismiss}
				onSave={onSave}
			/>,
		);
		await fireEvent.press(screen.getByText("Cancel"));
		expect(onDismiss).toHaveBeenCalled();
		expect(onSave).not.toHaveBeenCalled();
	});
});
