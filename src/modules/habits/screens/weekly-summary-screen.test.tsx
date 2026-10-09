import {
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import type { WeeklySummaryView } from "../hooks/use-weekly-summary-queries";
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

let mockSummary: WeeklySummaryView;
const mockUseWeeklySummaryQueries = jest.fn(() => mockSummary);
jest.mock("../hooks/use-weekly-summary-queries", () => ({
	useWeeklySummaryQueries: (...args: unknown[]) =>
		mockUseWeeklySummaryQueries(...(args as [])),
}));

// Which week the screen opens on depends on today's weekday — pinned here so
// these tests don't change verdict on Mondays (the rule itself is tested in
// weekly-summary.test.ts).
let mockDefaultWeek: "this" | "last" = "this";
// The real service module imports habit-service, whose freeze write path
// would otherwise open the SQLite client — only its pure helpers run here.
jest.mock("../repositories/frozen-day-repository", () => ({}));
jest.mock("../services/weekly-summary", () => ({
	...jest.requireActual("../services/weekly-summary"),
	defaultSummaryWeek: () => mockDefaultWeek,
}));

import { WeeklySummaryScreen } from "./weekly-summary-screen";

const week = { start: new Date(2026, 8, 14), end: new Date(2026, 8, 20) };
const mobility = makeHabit({ id: 6, name: "Mobility" });
const noPhone = makeHabit({
	id: 4,
	name: "No phone in bed",
	direction: "break",
});
const water = makeHabit({ id: 1, name: "Glass of water" });

function row(habit: typeof water, completed: number, scheduled: number) {
	return { habit, completed, scheduled, fraction: completed / scheduled };
}

function summary(
	overrides: Partial<WeeklySummaryView> = {},
): WeeklySummaryView {
	const rows = [row(mobility, 2, 7), row(noPhone, 5, 7), row(water, 7, 7)];
	return {
		week,
		completed: 14,
		scheduled: 21,
		rows,
		bestDay: { date: new Date(2026, 8, 15), completed: 3, scheduled: 3 },
		isPerfect: false,
		insight: { type: "slipping", row: rows[0] },
		hasHabits: true,
		isLoaded: true,
		...overrides,
	};
}

beforeEach(() => {
	mockDefaultWeek = "this";
	mockUseWeeklySummaryQueries.mockClear();
	mockPush.mockReset();
	mockReplace.mockReset();
	mockSummary = summary();
});

function barFillOf(label: string) {
	const rowView = screen.getByLabelText(label);
	return within(rowView).getByTestId("progress-bar").children[0];
}

describe("WeeklySummaryScreen", () => {
	it("renders a neutral blank — not 'Nothing to summarise yet' — while habits load (A5-04)", async () => {
		mockSummary = summary({ hasHabits: false, isLoaded: false, rows: [] });
		await render(<WeeklySummaryScreen />);
		expect(screen.getByTestId("screen-loading")).toBeTruthy();
		expect(screen.queryByText("Nothing to summarise yet")).toBeNull();
	});

	it("titles the screen as a heading and names its week switcher (A6-09, A6-05)", async () => {
		await render(<WeeklySummaryScreen />);
		expect(screen.getByRole("header", { name: "Your week" })).toBeTruthy();
		expect(screen.getByLabelText("Week shown").props.accessibilityRole).toBe(
			"tablist",
		);
	});

	it("shows the week range, totals, and best day", async () => {
		await render(<WeeklySummaryScreen />);
		expect(screen.getByText("14 – 20 SEPTEMBER")).toBeTruthy();
		expect(screen.getByText("Your week")).toBeTruthy();
		expect(
			screen.getByLabelText("Completed: 14, of 21 scheduled"),
		).toBeTruthy();
		expect(screen.getByLabelText("Best day: Tue, 3 of 3 done")).toBeTruthy();
	});

	it("lists every habit in the order given, worst first, labelling Break habits", async () => {
		await render(<WeeklySummaryScreen />);
		const labels = screen
			.getAllByText(/^(Mobility|No phone in bed|Glass of water)$/)
			.map((node) => node.props.children);
		expect(labels).toEqual(["Mobility", "No phone in bed", "Glass of water"]);
		// A Break habit's count says what was counted.
		expect(screen.getByText(/^\d+\/\d+ resisted$/)).toBeTruthy();
	});

	it("tints only the flagged habit's bar amber", async () => {
		await render(<WeeklySummaryScreen />);
		expect(barFillOf("Mobility: 2/7")).toHaveStyle({
			backgroundColor: semanticColors.light.warnInk,
		});
		expect(barFillOf("Glass of water: 7/7")).toHaveStyle({
			backgroundColor: surfaceColors.light.ink,
		});
	});

	it("flags the slipping habit and links into its Edit screen", async () => {
		await render(<WeeklySummaryScreen />);
		expect(screen.getByText("Mobility is slipping")).toBeTruthy();
		expect(screen.getByText(/^Two of seven days\./)).toBeTruthy();
		await fireEvent.press(screen.getByText("Reschedule habit →"));
		expect(mockPush).toHaveBeenCalledWith("/edit-habit/6?focus=frequency");
	});

	it("replaces the insight with a congratulatory card for a perfect week", async () => {
		mockSummary = summary({
			rows: [row(water, 7, 7)],
			completed: 7,
			scheduled: 7,
			isPerfect: true,
			insight: { type: "perfect" },
		});
		await render(<WeeklySummaryScreen />);
		expect(screen.getByText("Perfect week")).toBeTruthy();
		expect(screen.getByLabelText("Best day: All, every day full")).toBeTruthy();
		expect(screen.queryByText(/is slipping/)).toBeNull();
		expect(screen.queryByText("Reschedule habit →")).toBeNull();
	});

	it("keeps the slot filled when it's too early to call", async () => {
		mockSummary = summary({
			rows: [],
			completed: 0,
			scheduled: 0,
			bestDay: null,
			insight: { type: "too-early" },
		});
		await render(<WeeklySummaryScreen />);
		expect(screen.getByText("Too early to call")).toBeTruthy();
		expect(
			screen.getByText("Nothing has been due yet this week."),
		).toBeTruthy();
		expect(screen.getByLabelText("Best day: —, nothing done yet")).toBeTruthy();
	});

	it("opens on last week early in the week, and says so in its copy", async () => {
		mockDefaultWeek = "last";
		mockSummary = summary({ insight: { type: "too-early" } });
		await render(<WeeklySummaryScreen />);

		expect(mockUseWeeklySummaryQueries).toHaveBeenLastCalledWith("last");
		expect(
			screen.getByText("No habit has been due three times yet last week."),
		).toBeTruthy();
	});

	it("switches between last week and this week", async () => {
		await render(<WeeklySummaryScreen />);
		expect(mockUseWeeklySummaryQueries).toHaveBeenLastCalledWith("this");

		await fireEvent.press(screen.getByText("Last week"));
		expect(mockUseWeeklySummaryQueries).toHaveBeenLastCalledWith("last");

		await fireEvent.press(screen.getByText("This week"));
		expect(mockUseWeeklySummaryQueries).toHaveBeenLastCalledWith("this");
	});

	it("shows an empty state when there are no habits", async () => {
		mockSummary = summary({ hasHabits: false, rows: [] });
		await render(<WeeklySummaryScreen />);
		expect(screen.getByText("Nothing to summarise yet")).toBeTruthy();
		expect(screen.queryByText("Per habit")).toBeNull();
	});

	describe("range switcher (HAB-16)", () => {
		it("sits under the title with Week selected and Year enabled (HAB-17)", async () => {
			await render(<WeeklySummaryScreen />);
			expect(
				screen.getByText("Week").parent?.parent?.props.accessibilityState
					.selected,
			).toBe(true);
			expect(
				screen.getByText("Year").parent?.parent?.props.accessibilityState
					.disabled,
			).toBeFalsy();
			await fireEvent.press(screen.getByText("Year"));
			expect(mockReplace).toHaveBeenCalledWith("/habits/year");
		});

		it("goes to Monthly, keeping the Last week / This week switch where it was", async () => {
			await render(<WeeklySummaryScreen />);
			expect(screen.getByText("Last week")).toBeTruthy();
			await fireEvent.press(screen.getByText("Month"));
			expect(mockReplace).toHaveBeenCalledWith("/habits/month");
		});

		it("is hidden in the empty state", async () => {
			mockSummary = { ...mockSummary, hasHabits: false };
			await render(<WeeklySummaryScreen />);
			expect(screen.queryByText("Month")).toBeNull();
		});
	});
});
