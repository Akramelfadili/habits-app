import { fireEvent, render, screen } from "@testing-library/react-native";
import {
	PROGRESS_TODAY,
	read,
	yearView,
} from "../../test-support/progress-views";
import { ProgressYear } from "./progress-year";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

let mockView:
	| ReturnType<typeof yearView>
	| { state: "loading" }
	| { state: "no-habits" };
const mockUse = jest.fn((_options: unknown) => mockView);
jest.mock("../../hooks/use-progress-year-queries", () => ({
	useProgressYearQueries: (options: unknown) => mockUse(options),
}));

let mockAccessibilityText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockAccessibilityText,
}));
let mockScreenReader = false;
jest.mock("@/utils/use-screen-reader", () => ({
	useScreenReader: () => mockScreenReader,
}));

const handlers = {
	filtered: null,
	today: PROGRESS_TODAY,
	onOpenPicker: jest.fn(),
	onOpenMonth: jest.fn(),
	onChangeFrequency: jest.fn(),
	onAddHabit: jest.fn(),
	onGoToToday: jest.fn(),
};

beforeEach(() => {
	jest.clearAllMocks();
	mockAccessibilityText = false;
	mockScreenReader = false;
	mockView = yearView();
});

describe("ProgressYear — ready (P12)", () => {
	it("shows the tiles, the habit chip and the heat map in three bands", async () => {
		await render(<ProgressYear oneHabit={null} {...handlers} />);
		expect(screen.getByLabelText(/^Completion: /)).toBeTruthy();
		expect(screen.getByLabelText(/^Best streak: /)).toBeTruthy();
		expect(screen.getByLabelText(/^Best month: /)).toBeTruthy();
		expect(
			screen.getByRole("header", { name: "All habits · 2026" }),
		).toBeTruthy();
		expect(screen.getByText("Since 1 Sep")).toBeTruthy();
		expect(screen.getAllByTestId(/^year-band-band-/)).toHaveLength(3);
		expect(
			screen.getByText("Rows Mon → Sun · tap a month to open it"),
		).toBeTruthy();
		expect(screen.getByText("Less")).toBeTruthy();
	});

	it("opens a month from its label — the only tap targets on the map", async () => {
		await render(<ProgressYear oneHabit={null} {...handlers} />);
		await fireEvent.press(
			screen.getByRole("button", {
				name: /^October, 97 percent\. Opens Month\.$/,
			}),
		);
		expect(handlers.onOpenMonth).toHaveBeenCalledWith(new Date(2026, 9, 1));
	});

	it("opens the habit picker from the chip, which names the current filter", async () => {
		await render(<ProgressYear oneHabit={null} {...handlers} />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Show habit: All habits" }),
		);
		expect(handlers.onOpenPicker).toHaveBeenCalledTimes(1);
	});

	it("filters to one habit: its name on the chip and the card", async () => {
		await render(
			<ProgressYear oneHabit={null} {...handlers} filtered={read} />,
		);
		expect(mockUse).toHaveBeenCalledWith({ habitId: read.id });
		expect(
			screen.getByRole("header", { name: "Read 20 min · 2026" }),
		).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Show habit: Read 20 min" }),
		).toBeTruthy();
	});

	it("has no chip when there is only one habit to show", async () => {
		await render(<ProgressYear oneHabit={read} {...handlers} />);
		expect(screen.queryByTestId("habit-filter-chip")).toBeNull();
		expect(mockUse).toHaveBeenCalledWith({ habitId: read.id });
	});

	it("gives VoiceOver and AX3 the month list instead of the squares (P16)", async () => {
		mockScreenReader = true;
		await render(<ProgressYear oneHabit={null} {...handlers} />);
		expect(screen.queryByTestId("year-heat-map")).toBeNull();
		expect(screen.getByTestId("month-list")).toBeTruthy();
		expect(screen.getAllByText("97%").length).toBeGreaterThan(1);
		mockScreenReader = false;
	});

	it("also at large text sizes", async () => {
		mockAccessibilityText = true;
		await render(<ProgressYear oneHabit={null} {...handlers} />);
		expect(screen.getByTestId("month-list")).toBeTruthy();
		expect(
			screen.queryByText("Rows Mon → Sun · tap a month to open it"),
		).toBeNull();
	});
});

describe("ProgressYear — states", () => {
	it("is blank while loading, and offers Add habit with none", async () => {
		mockView = { state: "loading" };
		await render(<ProgressYear oneHabit={null} {...handlers} />);
		expect(screen.toJSON()).toBeNull();
		screen.unmount();
	});

	it("no habits (P3)", async () => {
		mockView = { state: "no-habits" };
		await render(<ProgressYear oneHabit={null} {...handlers} />);
		await fireEvent.press(screen.getByText("Add habit"));
		expect(handlers.onAddHabit).toHaveBeenCalledTimes(1);
	});

	it("too early: the unlock card and only the current band (P14)", async () => {
		mockView = yearView("too-early");
		await render(<ProgressYear oneHabit={null} {...handlers} />);
		expect(screen.getByText("Year view unlocks in 4 days")).toBeTruthy();
		expect(screen.getAllByTestId(/^year-band-band-/)).toHaveLength(1);
		expect(screen.getAllByRole("button")).toHaveLength(5);
	});

	it("nothing logged: a link to Today above the outlined map", async () => {
		mockView = yearView("nothing-logged");
		await render(<ProgressYear oneHabit={null} {...handlers} />);
		await fireEvent.press(screen.getByText("Go to Today"));
		expect(handlers.onGoToToday).toHaveBeenCalledTimes(1);
	});
});
