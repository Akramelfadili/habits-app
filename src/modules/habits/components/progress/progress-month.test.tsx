import { fireEvent, render, screen } from "@testing-library/react-native";
import { buildDayDetail } from "../../domain/progress-grid";
import {
	monthView,
	PROGRESS_TODAY,
	progressEntries,
	progressFrozen,
	progressHabits,
	read,
} from "../../test-support/progress-views";
import { ProgressMonth } from "./progress-month";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

let mockView:
	| ReturnType<typeof monthView>
	| { state: "loading" }
	| { state: "no-habits" };
const mockUse = jest.fn((_options: unknown) => mockView);
jest.mock("../../hooks/use-progress-month-queries", () => ({
	useProgressMonthQueries: (options: unknown) => mockUse(options),
}));
const mockDayDetail = jest.fn();
jest.mock("../../hooks/use-day-detail-queries", () => ({
	useDayDetailQueries: (date: Date | null, habitId: number | null) =>
		mockDayDetail(date, habitId),
}));

const handlers = {
	dot: () => "#00aa88",
	today: PROGRESS_TODAY,
	selectedKey: null as string | null,
	selectedDay: null as Date | null,
	month: null as Date | null,
	onSelectDay: jest.fn(),
	onEditDay: jest.fn(),
	onChangeFrequency: jest.fn(),
	onAddHabit: jest.fn(),
	onGoToToday: jest.fn(),
};

beforeEach(() => {
	jest.clearAllMocks();
	mockDayDetail.mockReturnValue({ loaded: false, detail: null });
	mockView = monthView();
});

describe("ProgressMonth — ready (P7)", () => {
	it("shows the tiles, the month's calendar with its legend and the per-habit rates", async () => {
		await render(<ProgressMonth oneHabit={null} {...handlers} />);
		expect(screen.getByLabelText(/^Completion: /)).toBeTruthy();
		expect(screen.getByLabelText(/^Perfect days: /)).toBeTruthy();
		expect(screen.getByRole("header", { name: "October" })).toBeTruthy();
		expect(screen.getByText("Daily completion")).toBeTruthy();
		expect(screen.getByTestId("month-calendar")).toBeTruthy();
		expect(screen.getByText("Less")).toBeTruthy();
		expect(screen.getByText("1 freeze left")).toBeTruthy();
		expect(screen.getByText("22 Oct frozen · 24–31 still ahead")).toBeTruthy();
		expect(screen.getByTestId("month-rates-card")).toBeTruthy();
		expect(screen.getByText("October so far")).toBeTruthy();
	});

	it("defaults to the current month, and asks for the habit's one when scoped", async () => {
		await render(<ProgressMonth oneHabit={read} {...handlers} />);
		expect(mockUse).toHaveBeenCalledWith({ habitId: read.id, month: null });
		expect(screen.queryByTestId("month-rates-card")).toBeNull();
	});

	it("opens the month a Year label named", async () => {
		const july = new Date(2026, 6, 1);
		await render(<ProgressMonth oneHabit={null} {...handlers} month={july} />);
		expect(mockUse).toHaveBeenCalledWith({ habitId: null, month: july });
	});

	it("rings a tapped day, and a second tap lets go of it", async () => {
		await render(<ProgressMonth oneHabit={null} {...handlers} />);
		await fireEvent.press(
			screen.getByRole("button", {
				name: "Wednesday 14 October, 100 percent",
			}),
		);
		expect(handlers.onSelectDay).toHaveBeenCalledTimes(1);
		expect(handlers.onSelectDay.mock.calls[0][0].getDate()).toBe(14);
	});

	it("shows the selected day's card with Edit this day", async () => {
		const date = new Date(2026, 9, 14);
		mockDayDetail.mockReturnValue({
			loaded: true,
			detail: buildDayDetail({
				habits: progressHabits,
				entries: progressEntries(),
				frozenDays: progressFrozen,
				today: PROGRESS_TODAY,
				date,
			}),
		});
		await render(
			<ProgressMonth
				oneHabit={null}
				{...handlers}
				selectedKey="2026-10-14"
				selectedDay={date}
			/>,
		);
		expect(screen.getByTestId("day-detail-card")).toBeTruthy();
		expect(screen.getByText("Wednesday, 14 October")).toBeTruthy();
		await fireEvent.press(
			screen.getByRole("button", { name: "Edit this day" }),
		);
		expect(handlers.onEditDay).toHaveBeenCalledWith(date);
		await fireEvent.press(screen.getByText("Close"));
		expect(handlers.onSelectDay).toHaveBeenCalledWith(null);
	});
});

describe("ProgressMonth — states", () => {
	it("is blank while loading", async () => {
		mockView = { state: "loading" };
		await render(<ProgressMonth oneHabit={null} {...handlers} />);
		expect(screen.toJSON()).toBeNull();
	});

	it("no habits: Add habit (P3)", async () => {
		mockView = { state: "no-habits" };
		await render(<ProgressMonth oneHabit={null} {...handlers} />);
		await fireEvent.press(screen.getByText("Add habit"));
		expect(handlers.onAddHabit).toHaveBeenCalledTimes(1);
	});

	it("nothing logged: a link to Today above the outlined calendar", async () => {
		mockView = monthView("nothing-logged");
		await render(<ProgressMonth oneHabit={null} {...handlers} />);
		expect(
			screen.getByText(
				"Tick a habit on Today and this month starts filling in.",
			),
		).toBeTruthy();
		await fireEvent.press(screen.getByText("Go to Today"));
		expect(handlers.onGoToToday).toHaveBeenCalledTimes(1);
		expect(
			screen.getAllByTestId("completion-cell-nothing-logged").length,
		).toBeGreaterThan(0);
	});

	it("too early: the unlock card, and the calendar with its earlier days dashed (P9)", async () => {
		mockView = monthView("too-early");
		await render(<ProgressMonth oneHabit={null} {...handlers} />);
		expect(screen.getByText("Month summary unlocks in 4 days")).toBeTruthy();
		expect(
			screen.getByText("Started Wed 21 Oct · earlier days dashed"),
		).toBeTruthy();
		expect(
			screen.getAllByTestId("completion-cell-before-start").length,
		).toBeGreaterThan(0);
		expect(screen.queryByTestId("month-rates-card")).toBeNull();
		expect(screen.queryByLabelText(/^Completion: /)).toBeNull();
	});
});
