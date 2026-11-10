import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeHabit } from "../../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { TodayRestDay } from "./today-rest-day";

const walk = makeHabit({
	id: 4,
	name: "Walk",
	frequency: { type: "weekdays", days: [1] },
});
const shower = makeHabit({
	id: 5,
	name: "Cold shower",
	frequency: { type: "per-week", timesPerWeek: 3 },
});

function setup(overrides = {}) {
	const handlers = { onOpenHabit: jest.fn(), onLogBonus: jest.fn() };
	const view = render(
		<TodayRestDay
			isToday
			notDueHabits={[walk]}
			loggedToday={[]}
			completedThisWeekByHabitId={new Map()}
			eligibleHabits={[walk]}
			{...handlers}
			{...overrides}
		/>,
	);
	return { view, ...handlers };
}

describe("TodayRestDay", () => {
	it("says a rest day keeps every streak safe and that a log is a bonus", async () => {
		await setup().view;
		expect(screen.getByText("Rest day")).toBeTruthy();
		expect(
			screen.getByText(
				"Nothing is due today, so every streak is safe. Anything you log counts as a bonus.",
			),
		).toBeTruthy();
	});

	it("lists the not-due habits under 'Not due today · Bonus logs' with dashed circles", async () => {
		await setup().view;
		expect(
			screen.getByRole("header", { name: "Not due today, Bonus logs" }),
		).toBeTruthy();
		expect(screen.getByText("Mon · tap to log a bonus")).toBeTruthy();
	});

	it("logs a bonus from a dashed circle", async () => {
		const { view, onLogBonus } = setup();
		await view;
		await fireEvent.press(screen.getByLabelText("Walk, not due, bonus"));
		expect(onLogBonus).toHaveBeenCalledWith(walk);
	});

	it("shows a per-week habit that met its target as done, 'back Monday'", async () => {
		await setup({
			notDueHabits: [shower],
			completedThisWeekByHabitId: new Map([[5, 3]]),
		}).view;
		expect(screen.getByText("3 of 3 this week · back Monday")).toBeTruthy();
	});

	it("words a past rest day in the past tense", async () => {
		await setup({ isToday: false }).view;
		expect(
			screen.getByText(
				"Nothing was due on this day. Anything you log counts as a bonus.",
			),
		).toBeTruthy();
	});

	it("opens the picker and hands the pick up once the picker has closed", async () => {
		const { view, onLogBonus } = setup();
		await view;
		await fireEvent.press(screen.getByText("Log a different habit"));
		// The picker lists it after the row already on screen.
		await fireEvent.press(screen.getAllByText("Walk").at(-1) as never);
		expect(onLogBonus).toHaveBeenCalledWith(walk);
	});
});
