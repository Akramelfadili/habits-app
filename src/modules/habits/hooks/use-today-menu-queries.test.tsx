import { render, renderHook, screen } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, Habit } from "../types";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: jest.fn() }),
}));

// Wednesday 16 Sep 2026 — the Weekly screen opens on "this week" from here on.
const TODAY = new Date(2026, 8, 16, 12);

let mockActive: Habit[] = [];
let mockArchived: Habit[] = [];
let mockEntries: Entry[] = [];
jest.mock("../repositories/habit-repository", () => ({
	useActiveHabits: () => mockActive,
	useArchivedHabits: () => mockArchived,
	useHabitsList: () => [...mockActive, ...mockArchived],
}));
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: () => mockEntries,
}));
jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDays: () => [],
}));
let mockLastExport: string | null = null;
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	useAppSetting: () => mockLastExport,
}));

import { WeeklySummaryScreen } from "../screens/weekly-summary-screen";
import { useTodayMenuQueries } from "./use-today-menu-queries";

function entry(habitId: number, date: string): Entry {
	return { id: 0, habitId, date, createdAt: new Date(date) };
}

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(TODAY);
	mockActive = [
		makeHabit({ id: 1, createdAt: new Date(2026, 0, 1) }),
		makeHabit({ id: 2, name: "Read", createdAt: new Date(2026, 0, 1) }),
	];
	mockArchived = [];
	mockLastExport = null;
	mockEntries = [
		entry(1, "2026-09-14"),
		entry(1, "2026-09-15"),
		entry(2, "2026-09-16"),
	];
});

afterEach(() => {
	jest.useRealTimers();
});

describe("useTodayMenuQueries (HAB-14)", () => {
	it("summarizes the week with the Weekly screen's own numbers", async () => {
		const { result } = await renderHook(() => useTodayMenuQueries());
		const [, completed, scheduled] =
			result.current.weekly.subline.match(/· (\d+) of (\d+) done$/) ?? [];
		expect(result.current.weekly.subline).toMatch(/^14 — 20 September · /);

		// Same fixture on the Weekly screen: its Completed tile says the same.
		await render(<WeeklySummaryScreen />);
		expect(screen.getByText(completed)).toBeTruthy();
		expect(screen.getByText(`of ${scheduled} scheduled`)).toBeTruthy();
	});

	it("reports active and archived counts for Manage", async () => {
		mockArchived = [makeHabit({ id: 9 }), makeHabit({ id: 10 })];
		const { result } = await renderHook(() => useTodayMenuQueries());
		expect(result.current.manage.subline).toBe("2 active · 2 archived");
	});

	it("describes Monthly with the last complete month once there's a month of history (HAB-16)", async () => {
		mockEntries = [entry(1, "2026-08-03"), entry(1, "2026-08-04")];
		const { result } = await renderHook(() => useTodayMenuQueries());
		expect(result.current.monthly.disabledReason).toBeUndefined();
		expect(result.current.monthly.subline).toMatch(
			/^1 — 31 August · \d+% done$/,
		);
	});

	it("locks Monthly until the first month of history is in, saying when (HAB-16)", async () => {
		mockActive = [
			makeHabit({ id: 1, createdAt: new Date(2026, 8, 4, 8) }),
			makeHabit({ id: 2, name: "Read", createdAt: new Date(2026, 8, 6, 8) }),
		];
		const { result } = await renderHook(() => useTodayMenuQueries());
		expect(result.current.monthly).toEqual({
			subline: "",
			disabledReason: "Unlocks 4 October",
		});
	});

	it("keeps Year as a 'Coming soon' placeholder once habits exist", async () => {
		const { result } = await renderHook(() => useTodayMenuQueries());
		expect(result.current.yearly.disabledReason).toBe("Coming soon");
		expect(result.current.weekly.disabledReason).toBeUndefined();
	});

	it("keeps Settings usable and describes it statically until a first export (HAB-15)", async () => {
		const { result } = await renderHook(() => useTodayMenuQueries());
		expect(result.current.settings).toEqual({
			subline: "Appearance, evening review, export",
		});
	});

	it("shows the last export date on Settings once one has happened (HAB-15)", async () => {
		mockLastExport = "2026-08-02";
		const { result } = await renderHook(() => useTodayMenuQueries());
		expect(result.current.settings.subline).toBe("Last export: 2 August");
	});

	it("says 'Today' for a same-day export (HAB-15)", async () => {
		mockLastExport = "2026-09-16";
		const { result } = await renderHook(() => useTodayMenuQueries());
		expect(result.current.settings.subline).toBe("Last export: Today");
	});

	it("gives the empty state the spec's reasons, with Manage still usable", async () => {
		mockActive = [];
		mockEntries = [];
		const { result } = await renderHook(() => useTodayMenuQueries());
		expect(result.current.weekly.disabledReason).toBe(
			"After your first full week",
		);
		expect(result.current.monthly.disabledReason).toBe(
			"After your first month",
		);
		expect(result.current.yearly.disabledReason).toBe("After three months");
		expect(result.current.manage).toEqual({ subline: "No habits yet" });
		// Settings must be usable before the first habit exists (HAB-14/15).
		expect(result.current.settings.disabledReason).toBeUndefined();
	});

	it("still counts archived habits when nothing is active", async () => {
		mockActive = [];
		mockArchived = [makeHabit({ id: 9 })];
		const { result } = await renderHook(() => useTodayMenuQueries());
		expect(result.current.manage.subline).toBe("0 active · 1 archived");
	});
});
