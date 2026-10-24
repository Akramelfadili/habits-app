import { render, screen } from "@testing-library/react-native";
import type { RecentEntry } from "../domain/habit-history";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry } from "../types";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { HabitEntryRow } from "./habit-entry-row";

const today = new Date(2026, 8, 23, 12);

function row(entry: Entry, note: string | null = null): RecentEntry {
	return { date: entry.date, entry, note };
}
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
				row={row({
					id: 1,
					habitId: 1,
					date: "2026-09-23",
					value: 6,
					createdAt: today,
				})}
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
				row={row({ id: 1, habitId: 1, date: "2026-09-15", createdAt: today })}
				today={today}
			/>,
		);
		expect(screen.getByText("Tue 15 Sep")).toBeTruthy();
		expect(screen.getByText("Resisted")).toBeTruthy();
	});

	it("shows the day's note as the subtitle (HAB-10)", async () => {
		await render(
			<HabitEntryRow
				habit={quantity}
				row={row(
					{ id: 1, habitId: 1, date: "2026-09-22", value: 8, createdAt: today },
					"Kept the bottle on the table — easy day.",
				)}
				today={today}
			/>,
		);
		expect(
			screen.getByText("Kept the bottle on the table — easy day."),
		).toBeTruthy();
	});

	it("lists a noted day with nothing logged as not logged, note underneath", async () => {
		await render(
			<HabitEntryRow
				habit={quantity}
				row={{ date: "2026-09-21", entry: null, note: "Sick, skipped it" }}
				today={today}
			/>,
		);
		expect(screen.getByText("Mon 21 Sep")).toBeTruthy();
		expect(screen.getByText("Not logged")).toBeTruthy();
		expect(screen.getByText("Sick, skipped it")).toBeTruthy();
	});

	it("keeps resistance framing for a Break habit's note-only day", async () => {
		await render(
			<HabitEntryRow
				habit={makeHabit({ direction: "break" })}
				row={{ date: "2026-09-21", entry: null, note: "Slipped" }}
				today={today}
			/>,
		);
		expect(screen.getByText("Not resisted")).toBeTruthy();
	});
});
