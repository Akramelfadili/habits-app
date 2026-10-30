import { fireEvent, render, screen } from "@testing-library/react-native";
import { ArchiveHabitSheet } from "./archive-habit-sheet";

function renderSheet(
	props: Partial<React.ComponentProps<typeof ArchiveHabitSheet>> = {},
) {
	const handlers = { onArchive: jest.fn(), onCancel: jest.fn() };
	return render(
		<ArchiveHabitSheet
			visible
			habitName="Read 20 min"
			{...handlers}
			{...props}
		/>,
	).then(() => handlers);
}

describe("ArchiveHabitSheet (DC5)", () => {
	it("names the habit and says what archiving keeps", async () => {
		await renderSheet();
		expect(screen.getByText("Archive Read 20 min?")).toBeTruthy();
		expect(
			screen.getByText(
				"It leaves Today and its reminders pause. History and streaks are kept — restore it any time from Habits › Archived.",
			),
		).toBeTruthy();
	});

	it("one tap: Archive habit, then Cancel under it, and no Close", async () => {
		const { onArchive, onCancel } = await renderSheet();
		const order = screen
			.getAllByText(/^(Archive habit|Cancel)$/)
			.map((node) => node.props.children);
		expect(order).toEqual(["Archive habit", "Cancel"]);
		expect(screen.queryByText("Close")).toBeNull();
		await fireEvent.press(screen.getByText("Archive habit"));
		await fireEvent.press(screen.getByText("Cancel"));
		expect(onArchive).toHaveBeenCalledTimes(1);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("the scrim and swipe-down are Cancel", async () => {
		const { onCancel } = await renderSheet();
		await fireEvent.press(screen.getByLabelText("Dismiss"));
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("while archiving, nothing can be pressed or swiped away", async () => {
		const { onArchive, onCancel } = await renderSheet({ isArchiving: true });
		await fireEvent.press(screen.getByText("Archive habit"));
		await fireEvent.press(screen.getByText("Cancel"));
		await fireEvent.press(screen.getByLabelText("Dismiss"));
		expect(onArchive).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});
});
