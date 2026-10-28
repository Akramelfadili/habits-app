import { fireEvent, render, screen } from "@testing-library/react-native";
import {
	PROGRESS_TODAY,
	read,
	weekView,
} from "../../test-support/progress-views";
import { ProgressWeek } from "./progress-week";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

let mockView:
	| ReturnType<typeof weekView>
	| { state: "loading" }
	| { state: "no-habits" };
const mockUse = jest.fn((_options: unknown) => mockView);
jest.mock("../../hooks/use-progress-week-queries", () => ({
	useProgressWeekQueries: (options: unknown) => mockUse(options),
}));

let mockAccessibilityText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockAccessibilityText,
}));

const handlers = {
	dot: () => "#00aa88",
	today: PROGRESS_TODAY,
	onEditDay: jest.fn(),
	onChangeFrequency: jest.fn(),
	onAddHabit: jest.fn(),
	onGoToToday: jest.fn(),
};

beforeEach(() => {
	mockAccessibilityText = false;
	jest.clearAllMocks();
});

describe("ProgressWeek — ready (P1)", () => {
	beforeEach(() => {
		mockView = weekView();
	});

	it("orders the stat tiles, the insight, the matrix and the week summary", async () => {
		await render(<ProgressWeek oneHabit={null} {...handlers} />);
		expect(screen.getByLabelText(/^Completion: 92%/)).toBeTruthy();
		expect(screen.getByText("Read 20 min is slipping")).toBeTruthy();
		expect(screen.getByTestId("week-matrix")).toBeTruthy();
		expect(screen.getByTestId("week-summary-card")).toBeTruthy();
		const order = [
			"progress-stat-tiles",
			"insight-card",
			"week-card",
			"week-summary-card",
		];
		const tree = JSON.stringify(screen.toJSON());
		const positions = order.map((id) => tree.indexOf(`"${id}"`));
		expect(positions).toEqual([...positions].sort((a, b) => a - b));
		expect(positions.every((position) => position >= 0)).toBe(true);
	});

	it("shows the legend with a word for every state, and the week's dates", async () => {
		await render(<ProgressWeek oneHabit={null} {...handlers} />);
		expect(screen.getByText("Not logged yet")).toBeTruthy();
		expect(screen.getByText("Off-schedule")).toBeTruthy();
		expect(screen.getByText("19 – 25 Oct")).toBeTruthy();
	});

	it("opens Edit this day from a day header", async () => {
		await render(<ProgressWeek oneHabit={null} {...handlers} />);
		await fireEvent.press(
			screen.getByRole("button", {
				name: "Wednesday 21 October. Edit this day",
			}),
		);
		expect(handlers.onEditDay).toHaveBeenCalledTimes(1);
		expect(handlers.onEditDay.mock.calls[0][0].getDate()).toBe(21);
	});

	it("sends the slipping habit to Edit habit's frequency", async () => {
		await render(<ProgressWeek oneHabit={null} {...handlers} />);
		await fireEvent.press(screen.getByText("Change frequency ›"));
		expect(handlers.onChangeFrequency).toHaveBeenCalledWith(read.id);
	});

	it("asks for one habit's data when scoped to it", async () => {
		await render(<ProgressWeek oneHabit={read} {...handlers} />);
		expect(mockUse).toHaveBeenCalledWith({ habitId: read.id });
	});
});

describe("ProgressWeek — states", () => {
	it("is blank while loading", async () => {
		mockView = { state: "loading" };
		await render(<ProgressWeek oneHabit={null} {...handlers} />);
		expect(screen.toJSON()).toBeNull();
	});

	it("no habits: the empty state with Add habit (P3)", async () => {
		mockView = { state: "no-habits" };
		await render(<ProgressWeek oneHabit={null} {...handlers} />);
		await fireEvent.press(screen.getByText("Add habit"));
		expect(handlers.onAddHabit).toHaveBeenCalledTimes(1);
	});

	it("nothing logged: outlined cells, a note, a link to Today (P4)", async () => {
		mockView = weekView("nothing-logged");
		await render(<ProgressWeek oneHabit={null} {...handlers} />);
		expect(screen.getByText("Nothing logged yet")).toBeTruthy();
		expect(
			screen.getByText("Outlined = nothing logged yet (not missed)"),
		).toBeTruthy();
		expect(screen.queryByTestId("progress-stat-tiles")).toBeNull();
		await fireEvent.press(screen.getByText("Go to Today"));
		expect(handlers.onGoToToday).toHaveBeenCalledTimes(1);
	});

	it("too early: the unlock card replaces tiles and insights, the matrix stays (P2)", async () => {
		mockView = weekView("too-early");
		await render(<ProgressWeek oneHabit={null} {...handlers} />);
		expect(screen.getByText("Insights unlock in 4 days")).toBeTruthy();
		expect(screen.getByText("3 of 7 days")).toBeTruthy();
		expect(screen.queryByTestId("progress-stat-tiles")).toBeNull();
		expect(screen.queryByTestId("insight-card")).toBeNull();
		expect(screen.getByTestId("week-matrix")).toBeTruthy();
		expect(
			screen.getByText("Started Wed 21 Oct · Mon–Tue before start"),
		).toBeTruthy();
	});
});

describe("ProgressWeek — one habit and large text", () => {
	it("one habit: a card of seven 40 pt days under its name, no summary card (P5)", async () => {
		mockView = weekView("ready", [read]);
		await render(<ProgressWeek oneHabit={read} {...handlers} />);
		expect(screen.getByText("Daily · your only habit")).toBeTruthy();
		expect(screen.getAllByTestId(/^completion-cell-/)[0]).toHaveStyle({
			width: 40,
			height: 40,
		});
		expect(screen.queryByTestId("week-summary-card")).toBeNull();
		expect(screen.queryByTestId("week-matrix")).toBeNull();
	});

	it("at AX3 the matrix becomes one block per habit, each cell its own stop (P6)", async () => {
		mockAccessibilityText = true;
		mockView = weekView();
		await render(<ProgressWeek oneHabit={null} {...handlers} />);
		expect(screen.queryByTestId("week-matrix")).toBeNull();
		expect(screen.getAllByTestId(/^week-block-/)).toHaveLength(3);
		expect(screen.getAllByLabelText("Mon, done").length).toBeGreaterThan(0);
	});

	it("opens Edit this day from a 40 pt cell in the blocks", async () => {
		mockAccessibilityText = true;
		mockView = weekView();
		await render(<ProgressWeek oneHabit={null} {...handlers} />);
		await fireEvent.press(screen.getAllByLabelText("Mon, done")[0]);
		expect(handlers.onEditDay).toHaveBeenCalledTimes(1);
	});
});
