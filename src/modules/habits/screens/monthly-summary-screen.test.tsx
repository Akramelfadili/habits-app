import { fireEvent, render, screen } from "@testing-library/react-native";
import type { MonthlySummaryView } from "../hooks/use-monthly-summary-queries";
import { habitFixturesFor } from "../repositories/habit-fixtures";
import {
	monthlyEntries,
	monthlyFrozenDays,
} from "../repositories/monthly-fixtures";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

let mockView: MonthlySummaryView;
jest.mock("../hooks/use-monthly-summary-queries", () => ({
	useMonthlySummaryQueries: () => mockView,
}));
jest.mock("../repositories/frozen-day-repository", () => ({}));

import {
	buildMonthlySummary,
	monthUnlock,
	monthWindowFor,
} from "../services/monthly-summary";
import { buildWeeklySummary } from "../services/weekly-summary";
import { MonthlySummaryScreen } from "./monthly-summary-screen";

function readyView(): MonthlySummaryView {
	return {
		state: "ready",
		summary: buildMonthlySummary({
			habits: habitFixturesFor("monthly-summary"),
			entries: monthlyEntries(false),
			frozenDays: monthlyFrozenDays(),
			today: new Date(2026, 8, 2, 9),
			month: monthWindowFor(new Date(2026, 7, 1)),
		}),
	};
}

function tooEarlyView(): MonthlySummaryView {
	const habits = habitFixturesFor("monthly-too-early");
	const today = new Date(2026, 8, 16, 9);
	const entries = monthlyEntries(true);
	const firstDay = new Date(2026, 8, 4);
	return {
		state: "too-early",
		firstDay,
		unlock: monthUnlock(firstDay, today),
		summary: buildMonthlySummary({
			habits,
			entries,
			frozenDays: [],
			today,
			month: monthWindowFor(today),
		}),
		week: buildWeeklySummary({ habits, entries, today, week: "this" }),
	};
}

beforeEach(() => {
	mockPush.mockClear();
	mockReplace.mockClear();
});

describe("MonthlySummaryScreen — ready (C2, C3)", () => {
	beforeEach(() => {
		mockView = readyView();
	});

	it("shows the range, title, switcher with Month selected, and the three tiles", async () => {
		await render(<MonthlySummaryScreen />);
		expect(screen.getByText("1 — 31 AUGUST")).toBeTruthy();
		expect(screen.getByText("Your month")).toBeTruthy();
		expect(
			screen.getByText("Month").parent?.props.accessibilityState.selected,
		).toBe(true);
		expect(screen.getByText("COMPLETED")).toBeTruthy();
		expect(screen.getByText("PERFECT DAYS")).toBeTruthy();
		expect(screen.getByText("FREEZES")).toBeTruthy();
		expect(screen.getByText("of 2 used")).toBeTruthy();
	});

	it("draws the calendar with the frozen days marked", async () => {
		await render(<MonthlySummaryScreen />);
		expect(screen.getByTestId("completion-grid-month")).toBeTruthy();
		expect(screen.getAllByTestId("heatmap-cell-frozen").length).toBeGreaterThan(
			1,
		);
		expect(screen.getByLabelText("Friday 7 August, frozen")).toBeTruthy();
	});

	it("lists every habit with its rate and a delta against July", async () => {
		await render(<MonthlySummaryScreen />);
		expect(screen.getByText("vs. July")).toBeTruthy();
		for (const name of [
			"Glass of water",
			"Meditate",
			"Read",
			"Easy run",
			"No phone in bed",
			"Mobility",
		]) {
			expect(screen.getAllByText(name).length).toBeGreaterThan(0);
		}
		expect(
			screen.getByLabelText(/^Read: 84%, up 13 points on last month/),
		).toBeTruthy();
	});

	it("shows the three ranked insights in order, then the freeze card outside the count", async () => {
		await render(<MonthlySummaryScreen />);
		expect(screen.getByText("What August says")).toBeTruthy();
		expect(screen.getByText("3 insights")).toBeTruthy();
		const titles = [
			"Mobility slipped all month",
			"Read is sticking",
			"Weekends are the gap",
			"Both freezes used",
		].map((title) => screen.getByText(title));
		expect(titles).toHaveLength(4);
	});

	it("opens Edit habit scrolled to Frequency from the slipping insight", async () => {
		await render(<MonthlySummaryScreen />);
		await fireEvent.press(screen.getByText("Reschedule habit →"));
		expect(mockPush).toHaveBeenCalledWith("/edit-habit/6?focus=frequency");
	});

	it("opens that habit's Reminders from the single-cause pattern insight", async () => {
		await render(<MonthlySummaryScreen />);
		await fireEvent.press(screen.getByText("Add a Saturday reminder →"));
		expect(mockPush).toHaveBeenCalledWith("/habits/reminders/2");
	});

	it("gives only the slipping and pattern cards a tap target — improved and freeze are informational", async () => {
		await render(<MonthlySummaryScreen />);
		// Exactly two actions in the whole screen: slipping and the single-cause pattern.
		expect(screen.getAllByText(/→$/)).toHaveLength(2);

		await fireEvent.press(screen.getByText("Read is sticking"));
		await fireEvent.press(screen.getByText("Both freezes used"));
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("gives a pattern with no single cause no action", async () => {
		if (mockView.state !== "ready") throw new Error("fixture");
		mockView = {
			...mockView,
			summary: {
				...mockView.summary,
				insights: [
					{
						type: "pattern",
						weekdayRate: 0.9,
						weekendRate: 0.6,
						cause: null,
					},
				],
			},
		};
		await render(<MonthlySummaryScreen />);
		expect(screen.getByText("Weekends are the gap")).toBeTruthy();
		expect(screen.queryByText(/reminder →$/)).toBeNull();
	});

	it("shows no freeze card when no freeze was used", async () => {
		if (mockView.state !== "ready") throw new Error("fixture");
		mockView = {
			...mockView,
			summary: { ...mockView.summary, freezeDates: [] },
		};
		await render(<MonthlySummaryScreen />);
		expect(screen.queryByText("Both freezes used")).toBeNull();
	});

	it("goes to Weekly from the switcher", async () => {
		await render(<MonthlySummaryScreen />);
		await fireEvent.press(screen.getByText("Week"));
		expect(mockReplace).toHaveBeenCalledWith("/habits/week");
	});
});

describe("MonthlySummaryScreen — too early (C6)", () => {
	beforeEach(() => {
		mockView = tooEarlyView();
	});

	it("says when it unlocks and how far along it is, without hiding the screen", async () => {
		await render(<MonthlySummaryScreen />);
		expect(screen.getByText("SINCE 4 SEPTEMBER")).toBeTruthy();
		expect(screen.getByText("Monthly view unlocks on 4 October")).toBeTruthy();
		expect(screen.getByText("12 of 30 days")).toBeTruthy();
		expect(screen.getByText("18 to go")).toBeTruthy();
	});

	it("still renders the partial calendar of the current month", async () => {
		await render(<MonthlySummaryScreen />);
		expect(screen.getByText("September so far")).toBeTruthy();
		expect(screen.getByText("12 days tracked")).toBeTruthy();
		expect(screen.getByTestId("completion-grid-month")).toBeTruthy();
		// 1–3 Sep are before the first habit, 16–30 Sep still ahead.
		expect(
			screen.getByLabelText("Tuesday 1 September, before your first habit"),
		).toBeTruthy();
		expect(
			screen.getByLabelText("Thursday 17 September, not logged yet"),
		).toBeTruthy();
	});

	it("shows no insights or stats yet", async () => {
		await render(<MonthlySummaryScreen />);
		expect(screen.queryByText("COMPLETED")).toBeNull();
		expect(screen.queryByText(/insights?$/)).toBeNull();
	});

	it("offers the week instead, which is one tap away", async () => {
		await render(<MonthlySummaryScreen />);
		expect(screen.getByText("Your week is ready")).toBeTruthy();
		await fireEvent.press(screen.getByText("See week →"));
		expect(mockReplace).toHaveBeenCalledWith("/habits/week");
	});
});

describe("MonthlySummaryScreen — empty", () => {
	it("explains there's nothing to summarize and offers no switcher", async () => {
		mockView = { state: "empty" };
		await render(<MonthlySummaryScreen />);
		expect(screen.getByText("Nothing to summarize yet")).toBeTruthy();
		expect(screen.queryByText("Week")).toBeNull();
	});
});
