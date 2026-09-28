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
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
}));

let mockSummary: WeeklySummaryView;
jest.mock("../hooks/use-weekly-summary-queries", () => ({
	useWeeklySummaryQueries: () => mockSummary,
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
		...overrides,
	};
}

beforeEach(() => {
	mockPush.mockReset();
	mockSummary = summary();
});

function barFillOf(label: string) {
	const rowView = screen.getByLabelText(label);
	return within(rowView).getByTestId("progress-bar").children[0];
}

describe("WeeklySummaryScreen", () => {
	it("shows the week range, totals, and best day", async () => {
		await render(<WeeklySummaryScreen />);
		expect(screen.getByText("14 — 20 SEPTEMBER")).toBeTruthy();
		expect(screen.getByText("Your week")).toBeTruthy();
		expect(
			screen.getByLabelText("Completed: 14, of 21 scheduled"),
		).toBeTruthy();
		expect(screen.getByLabelText("Best day: Tue, 3 of 3 done")).toBeTruthy();
	});

	it("lists every habit in the order given, worst first, labelling Break habits", async () => {
		await render(<WeeklySummaryScreen />);
		const labels = screen
			.getAllByText(/^(Mobility|No phone in bed · resisted|Glass of water)$/)
			.map((node) => node.props.children);
		expect(labels).toEqual([
			"Mobility",
			"No phone in bed · resisted",
			"Glass of water",
		]);
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
		expect(mockPush).toHaveBeenCalledWith("/edit-habit/6");
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

	it("shows an empty state when there are no habits", async () => {
		mockSummary = summary({ hasHabits: false, rows: [] });
		await render(<WeeklySummaryScreen />);
		expect(screen.getByText("Nothing to summarize yet")).toBeTruthy();
		expect(screen.queryByText("Per habit")).toBeNull();
	});
});
