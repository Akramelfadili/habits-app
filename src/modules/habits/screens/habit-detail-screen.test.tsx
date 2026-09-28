import { render, screen } from "@testing-library/react-native";
import type { HabitDetail } from "../hooks/use-habit-detail-queries";
import { makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("../repositories/frozen-day-repository", () => ({}));

const today = new Date(2026, 8, 23, 12);
let mockDetail: HabitDetail | null = null;
jest.mock("../hooks/use-habit-detail-queries", () => ({
	useHabitDetailQueries: () => mockDetail,
}));

import { buildHeatmapWeeks } from "../services/habit-history";
import { HabitDetailScreen } from "./habit-detail-screen";

const habit = makeHabit({
	name: "Glass of water",
	category: "Morning",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
	createdAt: new Date(2026, 0, 1),
});

function detail(overrides: Partial<HabitDetail> = {}): HabitDetail {
	return {
		habit,
		currentStreak: 24,
		longestStreak: { days: 41, endedOn: new Date(2026, 5, 30) },
		completionRate: { completed: 78, scheduled: 90, fraction: 78 / 90 },
		heatmapWeeks: buildHeatmapWeeks({
			habit,
			entries: [],
			frozenDates: new Set(),
			today,
		}),
		recentEntries: [
			{ id: 2, habitId: 1, date: "2026-09-23", value: 6, createdAt: today },
			{ id: 1, habitId: 1, date: "2026-09-22", value: 8, createdAt: today },
		],
		hasEntries: true,
		today,
		...overrides,
	};
}

describe("HabitDetailScreen", () => {
	it("shows the header, the three stat tiles, and recent entries in order", async () => {
		mockDetail = detail();
		await render(<HabitDetailScreen habitId={1} />);

		expect(screen.getByText("Glass of water")).toBeTruthy();
		expect(screen.getByText("Morning · 8 glasses · daily")).toBeTruthy();
		expect(screen.getByLabelText("Current: 24, day streak")).toBeTruthy();
		expect(screen.getByLabelText("Longest: 41, days, in June")).toBeTruthy();
		expect(screen.getByLabelText("90 days: 87%, 78 of 90 due")).toBeTruthy();
		expect(screen.getByText("Last 10 weeks")).toBeTruthy();

		const dates = screen
			.getAllByText(/^(Today|Yesterday)$/)
			.map((node) => node.props.children);
		expect(dates).toEqual(["Today", "Yesterday"]);
		expect(screen.getByText("6 / 8")).toBeTruthy();
	});

	it("renders the new-habit variant: zero/dash stats and an entries prompt", async () => {
		mockDetail = detail({
			currentStreak: 0,
			longestStreak: { days: 0, endedOn: null },
			completionRate: { completed: 0, scheduled: 0, fraction: null },
			recentEntries: [],
			hasEntries: false,
		});
		await render(<HabitDetailScreen habitId={1} />);

		expect(screen.getByLabelText("Longest: 0, no streak yet")).toBeTruthy();
		expect(screen.getByLabelText("90 days: —, 0 of 0 due")).toBeTruthy();
		expect(screen.getByText("Nothing logged yet")).toBeTruthy();
		expect(screen.getByText("No entries yet")).toBeTruthy();
	});

	it("handles an id that no longer resolves", async () => {
		mockDetail = null;
		await render(<HabitDetailScreen habitId={99} />);
		expect(screen.getByText("Habit not found")).toBeTruthy();
	});
});
