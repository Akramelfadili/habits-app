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

// Local dates, as the repository keys by the local calendar day (G-02).
const MONTH_START = new Date(2026, 8, 1);
const MONTH_END = new Date(2026, 8, 30);

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
			await freezeHabitDay(1, new Date(2026, 8, 15));
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
		const day = new Date(2026, 8, 15);

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
			await freezeHabitDay(1, new Date(2026, 8, 15));
			await freezeHabitDay(1, new Date(2026, 8, 15));
		});

		expect(
			result.current.filter((frozenDay) => frozenDay.habitId === 1),
		).toHaveLength(1);
	});

	it("counts freezes used in a month across every habit", async () => {
		const { freezeHabitDay, getFreezesUsedInMonth } = loadRepository();

		await act(async () => {
			await freezeHabitDay(1, new Date(2026, 8, 5));
			await freezeHabitDay(2, new Date(2026, 8, 20));
		});

		await expect(getFreezesUsedInMonth(MONTH_START, MONTH_END)).resolves.toBe(
			2,
		);
	});

	it("excludes freezes outside the given month", async () => {
		const { freezeHabitDay, getFreezesUsedInMonth } = loadRepository();

		await act(async () => {
			await freezeHabitDay(1, new Date(2026, 7, 31));
		});

		await expect(getFreezesUsedInMonth(MONTH_START, MONTH_END)).resolves.toBe(
			0,
		);
	});

	it("counts exactly 1 and 30 September out of 31 Aug, 1 Sep, 30 Sep, 1 Oct", async () => {
		const { freezeHabitDay, getFreezesUsedInMonth } = loadRepository();

		await act(async () => {
			await freezeHabitDay(1, new Date(2026, 7, 31));
			await freezeHabitDay(2, new Date(2026, 8, 1));
			await freezeHabitDay(3, new Date(2026, 8, 30));
			await freezeHabitDay(4, new Date(2026, 9, 1));
		});

		await expect(getFreezesUsedInMonth(MONTH_START, MONTH_END)).resolves.toBe(
			2,
		);
	});
});
