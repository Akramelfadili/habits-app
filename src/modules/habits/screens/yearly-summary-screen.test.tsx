import { fireEvent, render, screen } from "@testing-library/react-native";
import { habitFixturesFor } from "../dev/habit-fixtures";
import { monthlyEntries } from "../dev/monthly-fixtures";
import { yearlyEntries, yearlyHabitFixtures } from "../dev/yearly-fixtures";
import type { YearlySummaryView } from "../hooks/use-yearly-summary-queries";
import { makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

let mockView: YearlySummaryView;
jest.mock("../hooks/use-yearly-summary-queries", () => ({
	useYearlySummaryQueries: () => mockView,
}));

import { buildWeeklySummary } from "../domain/weekly-summary";
import {
	buildYearlySummary,
	yearUnlock,
	yearWindowFor,
} from "../domain/yearly-summary";
import { YearlySummaryScreen } from "./yearly-summary-screen";

const NOW = new Date(2026, 8, 16, 9);

function readyView(): YearlySummaryView {
	return {
		state: "ready",
		firstDay: new Date(2026, 2, 3),
		summary: buildYearlySummary({
			habits: yearlyHabitFixtures().map((fixture) => makeHabit(fixture)),
			entries: yearlyEntries(),
			frozenDays: [],
			today: NOW,
			year: yearWindowFor(NOW),
		}),
	};
}

function tooEarlyView(): YearlySummaryView {
	const habits = habitFixturesFor("monthly-too-early");
	const entries = monthlyEntries(true);
	const firstDay = new Date(2026, 8, 4);
	return {
		state: "too-early",
		firstDay,
		unlock: yearUnlock(firstDay, NOW),
		summary: buildYearlySummary({
			habits,
			entries,
			frozenDays: [],
			today: NOW,
			year: yearWindowFor(NOW),
		}),
		week: buildWeeklySummary({ habits, entries, today: NOW, week: "this" }),
	};
}

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(NOW);
	mockPush.mockClear();
	mockReplace.mockClear();
});
afterEach(() => jest.useRealTimers());

describe("YearlySummaryScreen — ready (C4)", () => {
	beforeEach(() => {
		mockView = readyView();
	});

	it("titles the screen as a heading (A6-09)", async () => {
		await render(<YearlySummaryScreen />);
		expect(screen.getByRole("header", { name: "2026 so far" })).toBeTruthy();
	});

	it("shows the range, 'so far' title, switcher with Year selected, and the three tiles", async () => {
		await render(<YearlySummaryScreen />);
		expect(screen.getByText("3 MARCH – 16 SEPTEMBER")).toBeTruthy();
		expect(screen.getByText("2026 so far")).toBeTruthy();
		expect(
			screen.getByText("Year").parent?.parent?.props.accessibilityState
				.selected,
		).toBe(true);
		expect(screen.getByText("LOGGED")).toBeTruthy();
		expect(screen.getByText("OVERALL")).toBeTruthy();
		expect(screen.getByText("LONGEST")).toBeTruthy();
		expect(screen.getByText("41")).toBeTruthy();
		expect(screen.getByText("days · June")).toBeTruthy();
	});

	it("draws the chart with all twelve slots: two dashed before the start, the current month lighter, three dashed ahead", async () => {
		await render(<YearlySummaryScreen />);
		expect(screen.getByText("Completion by month")).toBeTruthy();
		expect(screen.getByText("Best: June · 91%")).toBeTruthy();
		expect(screen.getAllByTestId("chart-bar-empty")).toHaveLength(5);
		expect(screen.getAllByTestId("chart-bar-complete")).toHaveLength(6);
		expect(screen.getAllByTestId("chart-bar-current")).toHaveLength(1);
	});

	it("lists every habit with a twelve-cell strip, the leading months dashed", async () => {
		await render(<YearlySummaryScreen />);
		expect(screen.getByText("Per habit · by month")).toBeTruthy();
		for (const name of [
			"Glass of water",
			"Meditate",
			"Read",
			"Mobility",
			"Easy run",
			"Upper body",
		]) {
			expect(screen.getByText(name)).toBeTruthy();
		}
		const strips = screen.getAllByTestId("completion-grid-year");
		expect(strips).toHaveLength(6);
		expect(screen.getAllByTestId("heatmap-cell-outside")).toHaveLength(6 * 5);
	});
});

describe("YearlySummaryScreen — insights (C5)", () => {
	beforeEach(() => {
		mockView = readyView();
	});

	it("shows the three cards, best month first", async () => {
		await render(<YearlySummaryScreen />);
		expect(screen.getByText("What 2026 says")).toBeTruthy();
		expect(screen.getByText("3 insights")).toBeTruthy();
		expect(screen.getByText("June was your best month")).toBeTruthy();
		expect(screen.getByText("Read stuck")).toBeTruthy();
		expect(screen.getByText("Mobility never stuck")).toBeTruthy();
		// The fourth (seasonal) is cut by the cap.
		expect(screen.queryByText("Summer dip")).toBeNull();
	});

	it("only 'never stuck' is tappable — it opens Edit habit", async () => {
		await render(<YearlySummaryScreen />);
		const actions = screen.getAllByRole("button", { name: /→$/ });
		expect(actions).toHaveLength(1);
		await fireEvent.press(screen.getByText("Edit or archive Mobility →"));
		expect(mockPush).toHaveBeenCalledWith("/edit-habit/4");
		expect(screen.queryByText(/Edit or archive Read/)).toBeNull();
	});
});

describe("YearlySummaryScreen — too early (C7)", () => {
	beforeEach(() => {
		mockView = tooEarlyView();
	});

	it("says when it unlocks and how far along it is, without hiding the screen", async () => {
		await render(<YearlySummaryScreen />);
		expect(screen.getByText("SINCE 4 SEPTEMBER")).toBeTruthy();
		expect(screen.getByText("Your year")).toBeTruthy();
		expect(screen.getByText("Year trends start after 3 months")).toBeTruthy();
		expect(screen.getByText("12 of 91 days")).toBeTruthy();
		expect(screen.getByText("from 4 December")).toBeTruthy();
	});

	it("still renders all twelve slots — one bar in progress, eleven dashed — and no insights", async () => {
		await render(<YearlySummaryScreen />);
		expect(screen.getAllByTestId("chart-bar-empty")).toHaveLength(11);
		expect(screen.getAllByTestId("chart-bar-current")).toHaveLength(1);
		expect(screen.queryByText(/What 2026 says/)).toBeNull();
	});

	it("offers the week instead, replacing the screen", async () => {
		await render(<YearlySummaryScreen />);
		await fireEvent.press(screen.getByText("Your week is ready"));
		expect(mockReplace).toHaveBeenCalledWith("/week");
	});

	it("keeps the switcher so Week and Month are one tap away", async () => {
		await render(<YearlySummaryScreen />);
		await fireEvent.press(screen.getByText("Month"));
		expect(mockReplace).toHaveBeenCalledWith("/month");
	});
});

describe("YearlySummaryScreen — early January on older history", () => {
	it("renders the chart, an 'early' card and dashes — never an empty-looking screen", async () => {
		const today = new Date(2027, 0, 3, 9);
		jest.setSystemTime(today);
		const habit = makeHabit({ id: 1, createdAt: new Date(2026, 5, 1) });
		mockView = {
			state: "ready",
			firstDay: new Date(2026, 5, 1),
			summary: buildYearlySummary({
				habits: [habit],
				entries: [],
				frozenDays: [],
				today,
				year: yearWindowFor(today),
			}),
		};
		await render(<YearlySummaryScreen />);
		expect(screen.getByText("2027 so far")).toBeTruthy();
		expect(screen.getByText("1 – 3 JANUARY")).toBeTruthy();
		expect(screen.getByText("Too early in the year to call")).toBeTruthy();
		expect(screen.getAllByTestId("chart-bar-empty")).toHaveLength(11);
		expect(screen.getByText("Completion by month")).toBeTruthy();
		expect(screen.queryByText(/NaN/)).toBeNull();
	});
});

describe("YearlySummaryScreen — empty", () => {
	it("explains there's nothing to summarize and offers no switcher", async () => {
		mockView = { state: "empty" };
		await render(<YearlySummaryScreen />);
		expect(screen.getByText("Nothing to summarise yet")).toBeTruthy();
		expect(screen.queryByText("Month")).toBeNull();
	});
});

describe("YearlySummaryScreen — all habits archived", () => {
	it("keeps the history but shows no insights section", async () => {
		const gone = makeHabit({
			id: 1,
			createdAt: new Date(2026, 0, 1),
			archivedAt: new Date(2026, 8, 1),
		});
		mockView = {
			state: "ready",
			firstDay: new Date(2026, 0, 1),
			summary: buildYearlySummary({
				habits: [gone],
				entries: [],
				frozenDays: [],
				today: NOW,
				year: yearWindowFor(NOW),
			}),
		};
		await render(<YearlySummaryScreen />);
		expect(screen.getByText("Completion by month")).toBeTruthy();
		expect(screen.queryByText("What 2026 says")).toBeNull();
	});
});
