import { fireEvent, render, screen } from "@testing-library/react-native";
import { DeleteHabitSheet } from "./delete-habit-sheet";

function renderSheet(
	overrides: Partial<React.ComponentProps<typeof DeleteHabitSheet>> = {},
) {
	const props = {
		visible: true,
		habitName: "Glass of water",
		loggedDays: 218,
		currentStreak: 24,
		canArchive: true,
		onKeep: jest.fn(),
		onArchive: jest.fn(),
		onDelete: jest.fn(),
		...overrides,
	};
	return render(<DeleteHabitSheet {...props} />).then(() => props);
}

/** The sheet's own controls — leaving out the (non-dismissing) scrim. */
function sheetControls() {
	return screen
		.getAllByRole("button")
		.filter((node) => node.props.accessibilityLabel !== "Dismiss");
}

describe("DeleteHabitSheet", () => {
	it("names the habit and what the delete would erase", async () => {
		await renderSheet();
		expect(screen.getByText("Delete “Glass of water”?")).toBeTruthy();
		expect(
			screen.getByText(
				"This removes the habit and all 218 days logged permanently. It cannot be undone.",
			),
		).toBeTruthy();
		expect(
			screen.getByText(
				"Hides it from Today, keeps every logged day and the 24-day streak. Reversible any time.",
			),
		).toBeTruthy();
	});

	it("E7: exactly three controls, safe-first — Archive card, Keep, then Delete last", async () => {
		await renderSheet();
		const order = screen
			.getAllByText(/^(Archive instead|Keep habit|Delete permanently)$/)
			.map((node) => node.props.children);
		expect(order).toEqual([
			"Archive instead",
			"Keep habit",
			"Delete permanently",
		]);
		expect(sheetControls()).toHaveLength(3);
		expect(screen.queryByText("Archive instead — keeps history")).toBeNull();
	});

	it("the whole archive card is the button, labelled with its consequence", async () => {
		const props = await renderSheet();
		await fireEvent.press(
			screen.getByRole("button", {
				name: "Archive instead. Hides it from Today, keeps every logged day and the 24-day streak. Reversible any time.",
			}),
		);
		expect(props.onArchive).toHaveBeenCalledTimes(1);
		expect(props.onDelete).not.toHaveBeenCalled();
	});

	it("routes Keep and Delete", async () => {
		const props = await renderSheet();
		await fireEvent.press(screen.getByText("Keep habit"));
		await fireEvent.press(screen.getByText("Delete permanently"));
		expect(props.onKeep).toHaveBeenCalledTimes(1);
		expect(props.onDelete).toHaveBeenCalledTimes(1);
	});

	it("offers no archive card for a habit that's already archived", async () => {
		await renderSheet({ canArchive: false });
		expect(screen.queryByText("Archive instead")).toBeNull();
		expect(screen.queryByTestId("action-card")).toBeNull();
		expect(sheetControls()).toHaveLength(2);
		expect(screen.getByText("Delete permanently")).toBeTruthy();
	});

	it("while working: the card, Keep and Delete are all inert", async () => {
		const props = await renderSheet({ isWorking: true });
		await fireEvent.press(screen.getByText("Archive instead"));
		await fireEvent.press(screen.getByText("Keep habit"));
		await fireEvent.press(screen.getByText("Delete permanently"));
		expect(props.onArchive).not.toHaveBeenCalled();
		expect(props.onKeep).not.toHaveBeenCalled();
		expect(props.onDelete).not.toHaveBeenCalled();
	});

	it("a double tap on the archive card archives once", async () => {
		const onArchive = jest.fn(() => new Promise<void>(() => {}));
		const props = await renderSheet({ onArchive });
		await fireEvent.press(screen.getByText("Archive instead"));
		await fireEvent.press(screen.getByText("Archive instead"));
		await fireEvent.press(screen.getByText("Delete permanently"));
		expect(onArchive).toHaveBeenCalledTimes(1);
		expect(props.onDelete).not.toHaveBeenCalled();
	});
});
