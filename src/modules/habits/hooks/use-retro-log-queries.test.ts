import { renderHook } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, EntryNote } from "../types";

const mockWater = makeHabit({
	id: 1,
	name: "Water",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});
const mockWalk = makeHabit({ id: 2, name: "Walk" });
const mockWeekendOnly = makeHabit({
	id: 3,
	frequency: { type: "weekdays", days: [6, 7] },
});
// Daily, so it'd show on any day if it weren't archived.
const mockArchived = makeHabit({
	id: 4,
	name: "Cold shower",
	archivedAt: new Date(2026, 8, 1),
});

let mockEntries: Entry[] = [];
let mockNotes: EntryNote[] = [];

jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => ({
		habits: [mockWalk, mockWater, mockWeekendOnly, mockArchived],
		loaded: true,
	}),
}));
jest.mock("../repositories/entry-repository", () => ({
	useAllEntries: () => mockEntries,
	useEntryNotes: () => mockNotes,
}));
// Only habit-service's pure helpers are reached.
jest.mock("../repositories/frozen-day-repository", () => ({}));

import { useRetroLogQueries } from "./use-retro-log-queries";

const TUESDAY = new Date(2026, 8, 15, 14, 30);

function entry(habitId: number, date: string, value?: number): Entry {
	return { id: habitId, habitId, date, value, createdAt: new Date() };
}

beforeEach(() => {
	mockEntries = [];
	mockNotes = [];
});

describe("useRetroLogQueries", () => {
	it("returns null while no day is selected", async () => {
		const { result } = await renderHook(() => useRetroLogQueries(1, null));
		expect(result.current).toBeNull();
	});

	it("lists that day's habits — the opening one first — with their saved values", async () => {
		mockEntries = [entry(1, "2026-09-15", 6), entry(2, "2026-09-14")];
		const { result } = await renderHook(() => useRetroLogQueries(1, TUESDAY));

		expect(result.current?.habits.map((habit) => habit.id)).toEqual([1, 2]);
		expect(result.current?.values).toEqual({ 1: 6, 2: false });
		expect(result.current?.date).toEqual(new Date(2026, 8, 15));
	});

	it("reads the opening habit's note for that day only", async () => {
		mockNotes = [
			{ habitId: 1, date: "2026-09-15", note: "Hotel" },
			{ habitId: 2, date: "2026-09-15", note: "Not this one" },
			{ habitId: 1, date: "2026-09-14", note: "Other day" },
		];
		const { result } = await renderHook(() => useRetroLogQueries(1, TUESDAY));
		expect(result.current?.note).toBe("Hotel");
	});

	it("an unnoted day starts with an empty note", async () => {
		const { result } = await renderHook(() => useRetroLogQueries(2, TUESDAY));
		expect(result.current?.note).toBe("");
	});

	it("leaves archived habits out of another habit's day (HAB-13)", async () => {
		const { result } = await renderHook(() => useRetroLogQueries(1, TUESDAY));
		expect(result.current?.habits.map((habit) => habit.id)).not.toContain(4);
	});

	it("still opens on an archived habit's own history", async () => {
		const { result } = await renderHook(() => useRetroLogQueries(4, TUESDAY));
		expect(result.current?.habits[0]?.id).toBe(4);
	});
});
