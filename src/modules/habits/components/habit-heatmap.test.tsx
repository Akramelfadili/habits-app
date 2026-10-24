import { fireEvent, render, screen } from "@testing-library/react-native";
import { buildHeatmapWeeks } from "../domain/habit-history";
import { makeHabit } from "../test-support/habit-builder";
import { HabitHeatmap } from "./habit-heatmap";

const today = new Date(2026, 8, 23, 12); // Wednesday
const habit = makeHabit({ createdAt: new Date(2026, 0, 1) });

function renderHeatmap({
	hasEntries = true,
	onSelectDay = jest.fn(),
	entries = [{ id: 1, habitId: 1, date: "2026-09-22", createdAt: today }],
	frozenDates = new Set(["2026-09-21"]),
} = {}) {
	const weeks = buildHeatmapWeeks({ habit, entries, frozenDates, today });
	return render(
		<HabitHeatmap
			habit={habit}
			weeks={weeks}
			hasEntries={hasEntries}
			rangeLabel="Jul — Sep"
			frozenLabel="2 freezes left"
			onSelectDay={onSelectDay}
		/>,
	);
}

describe("HabitHeatmap", () => {
	it("renders 70 cells with distinct completed, missed, frozen, and blank states", async () => {
		await renderHeatmap();
		expect(screen.getAllByTestId(/^heatmap-cell-/).length).toBe(70 + 5); // + legend swatches
		expect(screen.getByLabelText("Tuesday 22 September, logged")).toBeTruthy();
		expect(screen.getByLabelText("Monday 21 September, frozen")).toBeTruthy();
		expect(screen.getByLabelText("Sunday 20 September, missed")).toBeTruthy();
		expect(
			screen.getByLabelText("Thursday 24 September, upcoming"),
		).toBeTruthy();
	});

	it("shows the month range and legend once there's history", async () => {
		await renderHeatmap();
		expect(screen.getByText("Jul — Sep")).toBeTruthy();
		expect(screen.getByText("2 freezes left")).toBeTruthy();
	});

	it("hands a tapped past day to onSelectDay (the retro-log hook, HAB-10)", async () => {
		const onSelectDay = jest.fn();
		await renderHeatmap({ onSelectDay });
		await fireEvent.press(screen.getByLabelText("Sunday 20 September, missed"));
		expect(onSelectDay).toHaveBeenCalledTimes(1);
		expect(onSelectDay.mock.calls[0][0].getDate()).toBe(20);
	});

	it("doesn't make future days tappable", async () => {
		const onSelectDay = jest.fn();
		await renderHeatmap({ onSelectDay });
		await fireEvent.press(
			screen.getByLabelText("Thursday 24 September, upcoming"),
		);
		expect(onSelectDay).not.toHaveBeenCalled();
	});

	it("shows first-run copy instead of the legend with nothing logged", async () => {
		await renderHeatmap({
			hasEntries: false,
			entries: [],
			frozenDates: new Set(),
		});
		expect(screen.getByText("Nothing logged yet")).toBeTruthy();
		expect(
			screen.getByText("Cells fill in as you log — the first one is today."),
		).toBeTruthy();
		expect(screen.queryByText("Frozen")).toBeNull();
	});
});
