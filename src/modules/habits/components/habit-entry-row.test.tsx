import { render, screen } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("../repositories/frozen-day-repository", () => ({}));

import { HabitEntryRow } from "./habit-entry-row";

const today = new Date(2026, 8, 23, 12);
const quantity = makeHabit({
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});

describe("HabitEntryRow", () => {
	it("shows the date and value / target", async () => {
		await render(
			<HabitEntryRow
				habit={quantity}
				entry={{
					id: 1,
					habitId: 1,
					date: "2026-09-23",
					value: 6,
					createdAt: today,
				}}
				today={today}
			/>,
		);
		expect(screen.getByText("Today")).toBeTruthy();
		expect(screen.getByText("6 / 8")).toBeTruthy();
	});

	it("labels a simple Break habit's entry as resisted", async () => {
		await render(
			<HabitEntryRow
				habit={makeHabit({ direction: "break" })}
				entry={{ id: 1, habitId: 1, date: "2026-09-15", createdAt: today }}
				today={today}
			/>,
		);
		expect(screen.getByText("Tue 15 Sep")).toBeTruthy();
		expect(screen.getByText("Resisted")).toBeTruthy();
	});
});
