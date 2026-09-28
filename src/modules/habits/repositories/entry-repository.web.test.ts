import { act, renderHook } from "@testing-library/react-native";
import { format } from "date-fns";
import type * as WebEntryRepository from "./entry-repository.web";

function loadRepository(): typeof WebEntryRepository {
	let repository!: typeof WebEntryRepository;
	const react = jest.requireActual("react");
	jest.isolateModules(() => {
		jest.doMock("react", () => react);
		repository = require("./entry-repository.web");
	});
	return repository;
}

const TODAY = format(new Date(), "yyyy-MM-dd");
const RANGE_START = new Date(0);
const RANGE_END = new Date(8640000000000000);

describe("entry-repository.web", () => {
	it("starts from the fixture entries", async () => {
		const { useEntriesInRange } = loadRepository();
		const { result } = await renderHook(() =>
			useEntriesInRange(RANGE_START, RANGE_END),
		);
		expect(result.current.map((entry) => entry.habitId).sort()).toEqual([2, 3]);
	});

	it("completing a habit adds it and notifies live readers", async () => {
		const { setHabitCompletedOn, useEntriesInRange } = loadRepository();
		const { result } = await renderHook(() =>
			useEntriesInRange(RANGE_START, RANGE_END),
		);

		await act(async () => {
			await setHabitCompletedOn(1, new Date(), true);
		});

		expect(
			result.current.some(
				(entry) => entry.habitId === 1 && entry.date === TODAY,
			),
		).toBe(true);
	});

	it("completing twice does not create a duplicate", async () => {
		const { setHabitCompletedOn, useEntriesInRange } = loadRepository();
		const { result } = await renderHook(() =>
			useEntriesInRange(RANGE_START, RANGE_END),
		);

		await act(async () => {
			await setHabitCompletedOn(1, new Date(), true);
			await setHabitCompletedOn(1, new Date(), true);
		});

		expect(result.current.filter((entry) => entry.habitId === 1)).toHaveLength(
			1,
		);
	});

	it("un-completing removes the entry and notifies live readers", async () => {
		const { setHabitCompletedOn, useEntriesInRange } = loadRepository();
		const { result } = await renderHook(() =>
			useEntriesInRange(RANGE_START, RANGE_END),
		);

		await act(async () => {
			await setHabitCompletedOn(2, new Date(), false);
		});

		expect(result.current.some((entry) => entry.habitId === 2)).toBe(false);
	});

	it("excludes entries outside the requested range", async () => {
		const { useEntriesInRange } = loadRepository();
		const { result } = await renderHook(() =>
			useEntriesInRange(
				new Date("9999-01-01T00:00:00Z"),
				new Date("9999-01-02T00:00:00Z"),
			),
		);
		expect(result.current).toEqual([]);
	});

	describe("setHabitQuantityOn", () => {
		it("logs a value and notifies live readers", async () => {
			const { setHabitQuantityOn, useEntriesInRange } = loadRepository();
			const { result } = await renderHook(() =>
				useEntriesInRange(RANGE_START, RANGE_END),
			);

			await act(async () => {
				await setHabitQuantityOn(1, new Date(), 6);
			});

			const entry = result.current.find((candidate) => candidate.habitId === 1);
			expect(entry?.value).toBe(6);
		});

		it("updates the same day's value instead of adding a second entry", async () => {
			const { setHabitQuantityOn, useEntriesInRange } = loadRepository();
			const { result } = await renderHook(() =>
				useEntriesInRange(RANGE_START, RANGE_END),
			);

			await act(async () => {
				await setHabitQuantityOn(1, new Date(), 3);
				await setHabitQuantityOn(1, new Date(), 8);
			});

			const matches = result.current.filter(
				(candidate) => candidate.habitId === 1 && candidate.date === TODAY,
			);
			expect(matches).toHaveLength(1);
			expect(matches[0].value).toBe(8);
		});

		it("deletes the entry when the value is set to 0", async () => {
			const { setHabitQuantityOn, useEntriesInRange } = loadRepository();
			const { result } = await renderHook(() =>
				useEntriesInRange(RANGE_START, RANGE_END),
			);

			await act(async () => {
				await setHabitQuantityOn(1, new Date(), 6);
				await setHabitQuantityOn(1, new Date(), 0);
			});

			expect(
				result.current.some(
					(candidate) => candidate.habitId === 1 && candidate.date === TODAY,
				),
			).toBe(false);
		});
	});

	it("starts with no notes outside the habit-detail scenarios", async () => {
		const { useEntryNotes } = loadRepository();
		const { result } = await renderHook(() => useEntryNotes());
		expect(result.current).toEqual([]);
	});

	it("saveDayLog applies values and the note, and notifies live readers", async () => {
		const { saveDayLog, useEntriesInRange, useEntryNotes } = loadRepository();
		const { result } = await renderHook(() => ({
			entries: useEntriesInRange(RANGE_START, RANGE_END),
			notes: useEntryNotes(),
		}));

		await act(async () => {
			await saveDayLog(new Date(), {
				values: [
					{ habitId: 1, value: true },
					{ habitId: 3, value: false },
				],
				noteHabitId: 1,
				note: " Late walk ",
			});
		});

		const todays = result.current.entries.filter(
			(entry) => entry.date === TODAY,
		);
		expect(todays.map((entry) => entry.habitId).sort()).toEqual([1, 2]);
		expect(result.current.notes).toEqual([
			{ habitId: 1, date: TODAY, note: "Late walk" },
		]);

		await act(async () => {
			await saveDayLog(new Date(), { values: [], noteHabitId: 1, note: "" });
		});
		expect(result.current.notes).toEqual([]);
	});
});
