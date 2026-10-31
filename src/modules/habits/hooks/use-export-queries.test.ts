import { renderHook } from "@testing-library/react-native";
import { makeExportSource } from "../test-support/export-fixtures";

jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDays: () => mockSource.frozenDays,
}));
const mockSource = makeExportSource();
jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => ({ habits: mockSource.habits, loaded: true }),
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
});
