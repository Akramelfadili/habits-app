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

describe("DeleteHabitSheet", () => {
	it("names the habit and what the delete would erase", async () => {
		await renderSheet();
		expect(screen.getByText("Delete “Glass of water”?")).toBeTruthy();
		expect(
			screen.getByText(
				"This removes the habit and all 218 logged days permanently. It cannot be undone.",
			),
		).toBeTruthy();
		expect(
			screen.getByText(
				"Hides it from Today, keeps every log and the 24-day streak. Reversible any time.",
			),
		).toBeTruthy();
	});

	it("orders the actions safe-first: Keep, Archive instead, then Delete last", async () => {
		await renderSheet();
		const order = screen
			.getAllByText(
				/^(Keep habit|Archive instead — keeps history|Delete permanently)$/,
			)
			.map((node) => node.props.children);
		expect(order).toEqual([
			"Keep habit",
			"Archive instead — keeps history",
			"Delete permanently",
		]);
	});

	it("routes each action", async () => {
		const props = await renderSheet();
		await fireEvent.press(screen.getByText("Keep habit"));
		await fireEvent.press(screen.getByText("Archive instead — keeps history"));
		await fireEvent.press(screen.getByText("Delete permanently"));
		expect(props.onKeep).toHaveBeenCalledTimes(1);
		expect(props.onArchive).toHaveBeenCalledTimes(1);
		expect(props.onDelete).toHaveBeenCalledTimes(1);
	});

	it("offers no archive option for a habit that's already archived", async () => {
		await renderSheet({ canArchive: false });
		expect(screen.queryByText("Archive instead")).toBeNull();
		expect(screen.queryByText("Archive instead — keeps history")).toBeNull();
		expect(screen.getByText("Delete permanently")).toBeTruthy();
	});

	it("blocks every action while one is running", async () => {
		const props = await renderSheet({ isWorking: true });
		await fireEvent.press(screen.getByText("Delete permanently"));
		expect(props.onDelete).not.toHaveBeenCalled();
	});
});
