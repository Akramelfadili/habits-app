import { fireEvent, render, screen } from "@testing-library/react-native";
import { builtInCategory, makeHabit } from "../../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { TodayHabitList } from "./today-habit-list";

const read = makeHabit({ id: 1, name: "Read" });
const stretch = makeHabit({ id: 2, name: "Stretch" });
const groups = [
	{ category: builtInCategory("Other"), habits: [read, stretch] },
];

async function renderList(overrides = {}) {
	const handlers = {
		onToggle: jest.fn(),
		onOpenQuantitySheet: jest.fn(),
		onOpenHabit: jest.fn(),
		onOpenAtRisk: jest.fn(),
	};
	const view = await render(
		<TodayHabitList
			progress={{ completed: 1, total: 2, fraction: 0.5 }}
			groups={groups}
			completedHabitIds={new Set([1])}
			quantityValuesByHabitId={new Map()}
			completedThisWeekByHabitId={new Map()}
			atRiskByHabitId={new Map()}
			{...handlers}
			{...overrides}
		/>,
	);
	return { view, ...handlers };
}

describe("TodayHabitList", () => {
	it("shows the progress line and each group's count", async () => {
		await renderList();
		expect(screen.getByText("1 of 2 complete")).toBeTruthy();
		expect(screen.getByText("50%")).toBeTruthy();
		expect(screen.getByText("1/2")).toBeTruthy();
	});

	it("toggles from the circle and opens Detail from the name", async () => {
		const { onToggle, onOpenHabit } = await renderList();
		await fireEvent.press(screen.getByRole("checkbox", { name: "Stretch" }));
		expect(onToggle).toHaveBeenCalledWith(stretch);
		await fireEvent.press(screen.getByText("Stretch"));
		expect(onOpenHabit).toHaveBeenCalledWith(2);
	});

	it("opens the streak-at-risk sheet from an at-risk habit's row instead of Detail", async () => {
		const { onOpenAtRisk, onOpenHabit } = await renderList({
			atRiskByHabitId: new Map([
				[2, { missedDate: new Date(2026, 9, 3), currentStreak: 4 }],
			]),
		});
		await fireEvent.press(screen.getByText("Stretch"));
		expect(onOpenAtRisk).toHaveBeenCalledWith(2);
		expect(onOpenHabit).not.toHaveBeenCalled();
	});
});
