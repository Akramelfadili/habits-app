import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeHabit } from "../../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { TodayRestDay } from "./today-rest-day";

const walk = makeHabit({ id: 4, name: "Walk" });
const TODAY = new Date(2026, 9, 4, 9); // a Sunday

describe("TodayRestDay", () => {
	it("says what a rest day is and keeps the streaks safe", async () => {
		await render(
			<TodayRestDay
				today={TODAY}
				eligibleHabits={[walk]}
				loggedToday={[]}
				onOpenHabit={jest.fn()}
				onPickHabit={jest.fn()}
			/>,
		);
		expect(screen.getByText("Rest day")).toBeTruthy();
		expect(
			screen.getByText("Nothing is scheduled for Sunday. Streaks stay intact."),
		).toBeTruthy();
	});

	it("opens the picker and hands the pick up once the picker has closed", async () => {
		const onPickHabit = jest.fn();
		await render(
			<TodayRestDay
				today={TODAY}
				eligibleHabits={[walk]}
				loggedToday={[]}
				onOpenHabit={jest.fn()}
				onPickHabit={onPickHabit}
			/>,
		);
		await fireEvent.press(screen.getByText("Log something anyway"));
		await fireEvent.press(screen.getByText("Walk"));
		expect(onPickHabit).toHaveBeenCalledWith(walk);
	});
});
