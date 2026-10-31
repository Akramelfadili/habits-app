import { renderHook } from "@testing-library/react-native";
import { makeExportSource } from "../test-support/export-fixtures";

jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDays: () => mockSource.frozenDays,
}));
const mockSource = makeExportSource();
jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => ({ habits: mockSource.habits, loaded: true }),
}));
jest.mock("../repositories/reminder-repository", () => ({
	useAllReminders: () => mockSource.reminders,
}));
jest.mock("../repositories/category-repository", () => ({
	useCategories: () => mockSource.categories,
}));
jest.mock("../repositories/entry-repository", () => ({
	useAllEntries: () => mockSource.entries,
	useEntryNotes: () => mockSource.notes,
}));

import { useExportQueries } from "./use-export-queries";

describe("useExportQueries", () => {
	it("the archived toggle changes the counts the sheet quotes", async () => {
		const withArchived = await renderHook(() =>
			useExportQueries({ format: "csv", includeArchived: true }),
		);
		const without = await renderHook(() =>
			useExportQueries({ format: "csv", includeArchived: false }),
		);
		expect(withArchived.result.current.summary.logs).toBe(4);
		expect(without.result.current.summary.logs).toBe(3);
		expect(without.result.current.summary.archivedHabits).toBe(0);
	});

	it("hands the export everything it writes: reminders and categories as well as habits, logs, notes and frozen days", async () => {
		const { result } = await renderHook(() =>
			useExportQueries({ format: "json", includeArchived: true }),
		);
		expect(result.current.source.reminders).toBe(mockSource.reminders);
		expect(result.current.source.categories).toBe(mockSource.categories);
		expect(result.current.source.frozenDays).toBe(mockSource.frozenDays);
		expect(result.current.source.habits).toBe(mockSource.habits);
	});
});
