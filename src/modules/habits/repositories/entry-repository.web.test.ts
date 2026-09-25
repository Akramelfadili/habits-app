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
});
