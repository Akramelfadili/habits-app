import { fireEvent, render, screen } from "@testing-library/react-native";
import { buildDayDetail } from "../domain/progress-grid";
import {
	monthView,
	PROGRESS_TODAY,
	progressEntries,
	progressFrozen,
	progressHabits,
} from "../test-support/progress-views";
import { ProgressMonthScreen } from "./progress-month-screen";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush, navigate: jest.fn() }),
}));
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));
const mockNow = PROGRESS_TODAY;
jest.mock("../hooks/use-progress-shell-queries", () => ({
	useProgressShellQueries: () => ({
		today: mockNow,
		loaded: true,
		hasHabits: true,
		hasLogs: true,
	}),
}));
jest.mock("../hooks/use-progress-filter-queries", () => ({
	useProgressFilterQueries: () => ({
		active: [],
		archived: [],
		onlyHabit: null,
	}),
}));
const mockView = monthView();
const mockMonthHook = jest.fn();
jest.mock("../hooks/use-progress-month-queries", () => ({
	useProgressMonthQueries: (options: unknown) => {
		mockMonthHook(options);
		return mockView;
	},
}));
const mockDetailFor = (date: Date) =>
	buildDayDetail({
		habits: progressHabits,
		entries: progressEntries(),
		frozenDays: progressFrozen,
		today: mockNow,
		date,
	});
jest.mock("../hooks/use-day-detail-queries", () => ({
	useDayDetailQueries: (date: Date | null) =>
		date
			? { loaded: true, detail: mockDetailFor(date) }
			: { loaded: false, detail: null },
}));
jest.mock("../hooks/use-retro-log-queries", () => ({
	useRetroLogQueries: (_id: number | null, date: Date | null) =>
		date ? { date } : null,
}));
jest.mock("../components/export-sheet", () => ({ ExportSheet: () => null }));
jest.mock("../components/edit-day-sheet", () => {
	const { Text } = require("react-native");
	return {
		EditDaySheet: ({ day }: { day: { date: Date } | null }) =>
			day ? <Text>{`edit day ${day.date.getDate()}`}</Text> : null,
	};
});

describe("ProgressMonthScreen (P13, the pushed month)", () => {
	beforeEach(() => jest.clearAllMocks());

	it("opens the month it was given, headed by it", async () => {
		await render(<ProgressMonthScreen month="2026-07-01" />);
		expect(mockMonthHook).toHaveBeenCalledWith(
			expect.objectContaining({ month: new Date(2026, 6, 1) }),
		);
		expect(
			screen.getByRole("header", { name: "Progress. July 2026" }),
		).toBeTruthy();
		expect(screen.getByTestId("month-calendar")).toBeTruthy();
	});

	it("has no range switcher of its own: Back is the navigation header's", async () => {
		await render(<ProgressMonthScreen month="2026-07-01" />);
		expect(screen.queryByRole("tab")).toBeNull();
	});

	it("rings a day, shows its card and opens Edit this day", async () => {
		await render(<ProgressMonthScreen month="2026-10-01" />);
		await fireEvent.press(
			screen.getByRole("button", { name: /^Wednesday 14 October,/ }),
		);
		expect(screen.getByTestId("day-detail-card")).toBeTruthy();
		await fireEvent.press(
			screen.getByRole("button", { name: "Edit this day" }),
		);
		expect(screen.getByText("edit day 14")).toBeTruthy();
	});
});
