import { act, renderHook } from "@testing-library/react-native";
import type * as WebFrozenDayRepository from "./frozen-day-repository.web";

function loadRepository(): typeof WebFrozenDayRepository {
	let repository!: typeof WebFrozenDayRepository;
	const react = jest.requireActual("react");
	jest.isolateModules(() => {
		jest.doMock("react", () => react);
		repository = require("./frozen-day-repository.web");
	});
	return repository;
}

const MONTH_START = new Date("2026-09-01T00:00:00Z");
const MONTH_END = new Date("2026-09-30T00:00:00Z");

describe("frozen-day-repository.web", () => {
	it("starts empty — no scenario pre-seeds a freeze", async () => {
		const { useFrozenDays } = loadRepository();
		const { result } = await renderHook(() => useFrozenDays());
		expect(result.current).toEqual([]);
	});

	it("freezing a day adds it and notifies live readers", async () => {
		const { freezeHabitDay, useFrozenDays } = loadRepository();
		const { result } = await renderHook(() => useFrozenDays());

		await act(async () => {
			await freezeHabitDay(1, new Date("2026-09-15T00:00:00Z"));
		});

		expect(
			result.current.some(
				(frozenDay) =>
					frozenDay.habitId === 1 && frozenDay.date === "2026-09-15",
			),
		).toBe(true);
	});

	it("unfreezing removes the day and notifies live readers", async () => {
		const { freezeHabitDay, unfreezeHabitDay, useFrozenDays } =
			loadRepository();
		const { result } = await renderHook(() => useFrozenDays());
		const day = new Date("2026-09-15T00:00:00Z");

		await act(async () => {
			await freezeHabitDay(1, day);
		});
		expect(result.current.some((f) => f.habitId === 1)).toBe(true);

		await act(async () => {
			await unfreezeHabitDay(1, day);
		});
		expect(
			result.current.some((f) => f.habitId === 1 && f.date === "2026-09-15"),
		).toBe(false);
	});

	it("freezing the same day twice does not create a duplicate", async () => {
		const { freezeHabitDay, useFrozenDays } = loadRepository();
		const { result } = await renderHook(() => useFrozenDays());

		await act(async () => {
			await freezeHabitDay(1, new Date("2026-09-15T00:00:00Z"));
			await freezeHabitDay(1, new Date("2026-09-15T00:00:00Z"));
		});

		expect(
			result.current.filter((frozenDay) => frozenDay.habitId === 1),
		).toHaveLength(1);
	});

	it("counts freezes used in a month across every habit", async () => {
		const { freezeHabitDay, getFreezesUsedInMonth } = loadRepository();

		await act(async () => {
			await freezeHabitDay(1, new Date("2026-09-05T00:00:00Z"));
			await freezeHabitDay(2, new Date("2026-09-20T00:00:00Z"));
		});

		await expect(getFreezesUsedInMonth(MONTH_START, MONTH_END)).resolves.toBe(
			2,
		);
	});

	it("excludes freezes outside the given month", async () => {
		const { freezeHabitDay, getFreezesUsedInMonth } = loadRepository();

		await act(async () => {
			await freezeHabitDay(1, new Date("2026-08-31T00:00:00Z"));
		});

		await expect(getFreezesUsedInMonth(MONTH_START, MONTH_END)).resolves.toBe(
			0,
		);
	});
});
