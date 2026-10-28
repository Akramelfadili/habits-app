import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { builtInCategory, makeHabit } from "../../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { TodayHabitList } from "./today-habit-list";

const read = makeHabit({ id: 1, name: "Read" });
const stretch = makeHabit({ id: 2, name: "Stretch" });
const upperBody = makeHabit({ id: 3, name: "Upper body" });
const groups = [
	{ category: builtInCategory("Other"), habits: [read, stretch] },
];

async function renderList(overrides = {}) {
	const handlers = {
		onToggle: jest.fn(),
		onAddOne: jest.fn(),
		onOpenQuantitySheet: jest.fn(),
		onOpenHabit: jest.fn(),
		onOpenAtRisk: jest.fn(),
		onLogBonus: jest.fn(),
	};
	const view = await render(
		<TodayHabitList
			progress={{ completed: 1, total: 2, fraction: 0.5 }}
			groups={groups}
			completedHabitIds={new Set([1])}
			quantityValuesByHabitId={new Map()}
			completedThisWeekByHabitId={new Map()}
			atRiskByHabitId={new Map()}
			streakByHabitId={new Map()}
			frozenYesterdayByHabitId={new Map()}
			isToday
			dayLabel="Fri 23 Oct"
			notDueHabits={[]}
			loggedBonusIds={new Set()}
			{...handlers}
			{...overrides}
		/>,
	);
	return { view, ...handlers };
}

describe("TodayHabitList", () => {
	it("shows one progress bar: '1 of 2 done' and 50%", async () => {
		await renderList();
		expect(screen.getByText("1 of 2 done")).toBeTruthy();
		expect(screen.getByText("50%")).toBeTruthy();
	});

	it("names a past day in the progress line", async () => {
		await renderList({ isToday: false, dayLabel: "Wed 21 Oct" });
		expect(screen.getByText("1 of 2 done on Wed 21 Oct")).toBeTruthy();
	});

	it("shows each group with its 'x of y' count as a heading", async () => {
		await renderList();
		expect(
			screen.getByRole("header", { name: "Other, 1 of 2 done" }),
		).toBeTruthy();
		expect(screen.getByText("1 of 2")).toBeTruthy();
	});

	it("toggles from the circle and opens Detail from the name", async () => {
		const { onToggle, onOpenHabit } = await renderList();
		await fireEvent.press(screen.getByLabelText("Stretch, not done"));
		expect(onToggle).toHaveBeenCalledWith(stretch);
		await fireEvent.press(screen.getByText("Stretch"));
		expect(onOpenHabit).toHaveBeenCalledWith(2);
	});

	it("opens the streak-at-risk sheet from an at-risk row's name, and the circle still logs", async () => {
		const { onOpenAtRisk, onOpenHabit, onToggle } = await renderList({
			atRiskByHabitId: new Map([
				[2, { missedDate: new Date(2026, 9, 22), freezesRemaining: 1 }],
			]),
		});
		expect(screen.getByText("Missed Thursday · 1 freeze left")).toBeTruthy();
		await fireEvent.press(screen.getByText("Stretch"));
		expect(onOpenAtRisk).toHaveBeenCalledWith(2);
		expect(onOpenHabit).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByLabelText("Stretch, not done"));
		expect(onToggle).toHaveBeenCalledWith(stretch);
	});

	it("shows no all-done card until everything is done", async () => {
		await renderList();
		expect(screen.queryByTestId("today-all-done")).toBeNull();
	});

	it("shows the quiet all-done card at 100%, naming the longest streak", async () => {
		await renderList({
			progress: { completed: 2, total: 2, fraction: 1 },
			completedHabitIds: new Set([1, 2]),
			streakByHabitId: new Map([[1, 13]]),
		});
		expect(screen.getByText("All done for today")).toBeTruthy();
		expect(
			screen.getByText("2 of 2 · Read is on a 13-day streak"),
		).toBeTruthy();
	});

	describe("the not-due fold row", () => {
		it("folds not-due habits into one dashed row, without listing them", async () => {
			await renderList({ notDueHabits: [upperBody] });
			expect(screen.getByText("1 not due today · Upper body")).toBeTruthy();
			expect(screen.queryByLabelText("Upper body, not due, bonus")).toBeNull();
		});

		it("shows nothing when nothing is not due", async () => {
			await renderList();
			expect(screen.queryByText(/not due/)).toBeNull();
		});

		it("Show reveals them with dashed circles that log a bonus", async () => {
			const { onLogBonus } = await renderList({ notDueHabits: [upperBody] });
			await fireEvent.press(screen.getByText("Show"));
			expect(screen.getByText("Hide")).toBeTruthy();
			await act(() =>
				fireEvent.press(screen.getByLabelText("Upper body, not due, bonus")),
			);
			expect(onLogBonus).toHaveBeenCalledWith(upperBody);
		});
	});
});
