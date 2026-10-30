import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { useToastStore } from "@/store/toast-store";
import { buildDayDetail } from "../domain/progress-grid";
import {
	resetProgressView,
	useProgressViewStore,
} from "../progress-view-store";
import {
	monthView,
	PROGRESS_TODAY,
	progressEntries,
	progressFrozen,
	progressHabits,
	read,
	water,
	weekView,
	yearView,
} from "../test-support/progress-views";
import { ProgressScreen } from "./progress-screen";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush, navigate: mockNavigate }),
}));

// jest's window reports fontScale 2, i.e. accessibility sizes: say which one a test wants.
let mockAccessibilityText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockAccessibilityText,
}));
jest.mock("@/utils/use-screen-reader", () => ({
	useScreenReader: () => false,
}));

let mockShell = {
	today: PROGRESS_TODAY,
	loaded: true,
	hasHabits: true,
	hasLogs: true,
};
jest.mock("../hooks/use-progress-shell-queries", () => ({
	useProgressShellQueries: () => mockShell,
}));

let mockFilter: {
	active: unknown[];
	archived: unknown[];
	onlyHabit: unknown;
} = { active: [water, read], archived: [], onlyHabit: null };
jest.mock("../hooks/use-progress-filter-queries", () => ({
	useProgressFilterQueries: () => mockFilter,
}));

let mockWeek = weekView();
const mockMonth = monthView();
const mockYear = yearView();
jest.mock("../hooks/use-progress-week-queries", () => ({
	useProgressWeekQueries: () => mockWeek,
}));
jest.mock("../hooks/use-progress-month-queries", () => ({
	useProgressMonthQueries: () => mockMonth,
}));
jest.mock("../hooks/use-progress-year-queries", () => ({
	useProgressYearQueries: () => mockYear,
}));
const mockDetailFor = (date: Date) =>
	buildDayDetail({
		habits: progressHabits,
		entries: progressEntries(),
		frozenDays: progressFrozen,
		today: PROGRESS_TODAY,
		date,
	});
jest.mock("../hooks/use-day-detail-queries", () => ({
	useDayDetailQueries: (date: Date | null) =>
		date
			? { loaded: true, detail: mockDetailFor(date) }
			: { loaded: false, detail: null },
}));
jest.mock("../hooks/use-retro-log-queries", () => ({
	useRetroLogQueries: (_habitId: number | null, date: Date | null) =>
		date ? { date } : null,
}));
jest.mock("../components/export-sheet", () => {
	const { Text } = require("react-native");
	return {
		ExportSheet: ({ visible }: { visible: boolean }) =>
			visible ? <Text>export sheet</Text> : null,
	};
});
jest.mock("../components/edit-day-sheet", () => {
	const { Text } = require("react-native");
	return {
		EditDaySheet: ({ day }: { day: { date: Date } | null }) =>
			day ? <Text>{`edit day ${day.date.getDate()}`}</Text> : null,
	};
});

beforeEach(() => {
	jest.clearAllMocks();
	resetProgressView();
	useToastStore.setState({ toast: null });
	mockAccessibilityText = false;
	mockWeek = weekView();
	mockShell = {
		today: PROGRESS_TODAY,
		loaded: true,
		hasHabits: true,
		hasLogs: true,
	};
	mockFilter = { active: [water, read], archived: [], onlyHabit: null };
});

describe("ProgressScreen — the shell (HAB-35)", () => {
	it("is blank until habits and logs have loaded", async () => {
		mockShell = { ...mockShell, loaded: false };
		await render(<ProgressScreen />);
		expect(screen.getByTestId("screen-loading")).toBeTruthy();
	});

	it("opens on Week of the current week, under a Progress heading", async () => {
		await render(<ProgressScreen />);
		expect(
			screen.getByRole("header", { name: "Progress. Week of 19 October" }),
		).toBeTruthy();
		expect(screen.getByTestId("week-matrix")).toBeTruthy();
		expect(
			screen.getByRole("tab", { name: "Week" }).props.accessibilityState
				.selected,
		).toBe(true);
	});

	it("switches range with the segmented control: Month, then Year", async () => {
		await render(<ProgressScreen />);
		await fireEvent.press(screen.getByRole("tab", { name: "Month" }));
		expect(screen.getByTestId("month-calendar")).toBeTruthy();
		expect(
			screen.getByRole("header", { name: "Progress. October 2026" }),
		).toBeTruthy();
		await fireEvent.press(screen.getByRole("tab", { name: "Year" }));
		expect(screen.getByTestId("year-heat-map")).toBeTruthy();
		expect(screen.getByRole("header", { name: "Progress. 2026" })).toBeTruthy();
	});

	it("opens on the range last chosen, however the screen came to be mounted — a tab switch", async () => {
		await render(<ProgressScreen />);
		await fireEvent.press(screen.getByRole("tab", { name: "Year" }));
		// A fresh mount reads the same store: the range is not screen state.
		expect(useProgressViewStore.getState().range).toBe("year");
		resetProgressView();
		useProgressViewStore.setState({ range: "year" });
		await render(<ProgressScreen />);
		expect(screen.getAllByTestId("year-heat-map").length).toBeGreaterThan(0);
	});

	it("collapses the range to the selected one at accessibility sizes, and opens a list on tap (P6, P11)", async () => {
		mockAccessibilityText = true;
		await render(<ProgressScreen />);
		expect(screen.queryByRole("tab", { name: "Month" })).toBeNull();
		await fireEvent.press(screen.getByTestId("segmented-collapsed"));
		await fireEvent.press(screen.getByRole("tab", { name: "Month" }));
		expect(useProgressViewStore.getState().range).toBe("month");
	});
});

describe("ProgressScreen — under the tab bar (HAB-27, P17)", () => {
	it("scrolls with the shared 112 pt bottom padding, so the last card clears the pill", async () => {
		await render(<ProgressScreen />);
		expect(TAB_BAR_BOTTOM_PADDING).toBe(112);
		expect(
			StyleSheet.flatten(
				screen.getByTestId("progress-scroll").props.contentContainerStyle,
			).paddingBottom,
		).toBe(TAB_BAR_BOTTOM_PADDING);
	});

	it("hangs the inline bar and the pinned range bar from the screen, once each", async () => {
		await render(<ProgressScreen />);
		expect(screen.getAllByTestId("progress-range-bar")).toHaveLength(1);
		expect(screen.getAllByTestId("progress-inline-bar")).toHaveLength(1);
		// One switcher on screen: the pinned layer is the only one.
		expect(screen.getAllByLabelText("Range")).toHaveLength(1);
	});
});

describe("ProgressScreen — Export (P1, P3)", () => {
	it("opens the export sheet when there are logs", async () => {
		await render(<ProgressScreen />);
		await fireEvent.press(
			screen.getAllByRole("button", { name: "Export data" })[0],
		);
		expect(screen.getByText("export sheet")).toBeTruthy();
	});

	it("explains in a toast why it can't run without logs, and opens nothing", async () => {
		mockShell = { ...mockShell, hasLogs: false };
		await render(<ProgressScreen />);
		const button = screen.getAllByRole("button", { name: "Export data" })[0];
		expect(button.props.accessibilityState).toEqual({ disabled: true });
		await fireEvent.press(button);
		expect(useToastStore.getState().toast?.message).toBe(
			"Nothing to export yet. Log a habit on Today first, then come back.",
		);
		expect(screen.queryByText("export sheet")).toBeNull();
	});

	it("is unavailable with no habits at all", async () => {
		mockShell = { ...mockShell, hasHabits: false, hasLogs: false };
		await render(<ProgressScreen />);
		await fireEvent.press(
			screen.getAllByRole("button", { name: "Export data" })[0],
		);
		expect(useToastStore.getState().toast?.tone).toBe("info");
	});
});

describe("ProgressScreen — navigation inside Progress (HAB-34)", () => {
	it("opens Edit this day from a Week day header", async () => {
		await render(<ProgressScreen />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Tuesday 20 October. Edit this day" }),
		);
		expect(screen.getByText("edit day 20")).toBeTruthy();
	});

	it("rings a Month day, shows its card and opens Edit this day from it (P13)", async () => {
		await render(<ProgressScreen />);
		await fireEvent.press(screen.getByRole("tab", { name: "Month" }));
		await fireEvent.press(
			screen.getByRole("button", { name: "Wednesday 14 October, 100 percent" }),
		);
		expect(screen.getByTestId("day-detail-card")).toBeTruthy();
		expect(useProgressViewStore.getState().selectedDay).toBe("2026-10-14");
		await fireEvent.press(
			screen.getByRole("button", { name: "Edit this day" }),
		);
		expect(screen.getByText("edit day 14")).toBeTruthy();
		await fireEvent.press(screen.getByText("Close"));
		expect(screen.queryByTestId("day-detail-card")).toBeNull();
	});

	it("pushes a Year month as its own route, leaving Year where it is (P13)", async () => {
		await render(<ProgressScreen />);
		await fireEvent.press(screen.getByRole("tab", { name: "Year" }));
		await fireEvent.press(
			screen.getByRole("button", {
				name: /^October, \d+ percent\. Opens Month\.$/,
			}),
		);
		expect(mockPush).toHaveBeenCalledWith("/month/2026-10-01");
		// Nothing changes in place: Year stays the range, with no Back row of its own.
		expect(useProgressViewStore.getState().range).toBe("year");
		expect(screen.getByTestId("year-heat-map")).toBeTruthy();
	});

	it("shows the current month, in place, when Month is picked from the switcher (D15)", async () => {
		await render(<ProgressScreen />);
		await fireEvent.press(screen.getByRole("tab", { name: "Month" }));
		expect(
			screen.getByRole("header", { name: "Progress. October 2026" }),
		).toBeTruthy();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("opens Edit habit scrolled to Frequency from a slipping insight", async () => {
		await render(<ProgressScreen />);
		await fireEvent.press(screen.getByText("Change frequency ›"));
		expect(mockPush).toHaveBeenCalledWith("/edit-habit/2?focus=frequency");
	});

	it("filters the year to one habit from the picker, and closes it", async () => {
		await render(<ProgressScreen />);
		await fireEvent.press(screen.getByRole("tab", { name: "Year" }));
		await fireEvent.press(
			screen.getByRole("button", { name: "Show habit: All habits" }),
		);
		expect(screen.getByText("Show habit")).toBeTruthy();
		await fireEvent.press(screen.getAllByText("Read 20 min")[0]);
		expect(useProgressViewStore.getState().habitId).toBe(2);
	});
});

describe("ProgressScreen — states", () => {
	it("nothing logged: Go to Today switches to the Today tab", async () => {
		mockWeek = weekView("nothing-logged");
		await render(<ProgressScreen />);
		await fireEvent.press(screen.getByText("Go to Today"));
		expect(mockNavigate).toHaveBeenCalledWith("/");
	});

	it("no habits: Add habit opens the new-habit form", async () => {
		mockWeek = { state: "no-habits" } as never;
		await render(<ProgressScreen />);
		await fireEvent.press(screen.getByText("Add habit"));
		expect(mockPush).toHaveBeenCalledWith("/new-habit");
	});
});
