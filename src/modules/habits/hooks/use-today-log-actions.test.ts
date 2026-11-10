import { act, renderHook } from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";
import { makeHabit } from "../test-support/habit-builder";

const mockToggle = jest.fn();
const mockRestore = jest.fn();
const mockLogQuantity = jest.fn();
const WROTE = {
	ok: true,
	value: { returnedFreeze: null, freezesLeft: 2 },
};

jest.mock("./use-today-actions", () => ({
	useTodayActions: () => ({
		toggleCompletion: mockToggle,
		restoreDay: mockRestore,
	}),
}));
jest.mock("./use-quantity-log-actions", () => ({
	useQuantityLogActions: () => ({
		logQuantity: mockLogQuantity,
		isLogging: false,
	}),
}));

let mockEntries: { habitId: number; date: string; value?: number }[] = [];
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: (start: Date) => {
		const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
		return mockEntries.filter((entry) => entry.date === key);
	},
}));

import { useTodayLogActions } from "./use-today-log-actions";

const TODAY = new Date(2026, 9, 14);
const read = makeHabit({ id: 1, name: "Read" });
const water = makeHabit({
	id: 2,
	name: "Water",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});

function setup(
	values = new Map<number, number>(),
	selectedKey: string | null = null,
) {
	// The sheet reads its own day's entry: mirror the shown day's values into the store.
	mockEntries = [...values].map(([habitId, value]) => ({
		habitId,
		date: selectedKey ?? "2026-10-14",
		value,
	}));
	return renderHook(
		({ today }: { today: Date }) =>
			useTodayLogActions({
				today,
				selectedKey,
				completedHabitIds: new Set<number>(),
				quantityValuesByHabitId: values,
				loggableHabits: [read, water],
			}),
		{ initialProps: { today: TODAY } },
	);
}

describe("useTodayLogActions", () => {
	beforeEach(() => {
		jest.useFakeTimers({
			now: new Date(2026, 9, 14, 12),
			doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
		});
		mockToggle.mockReset().mockResolvedValue(WROTE);
		mockRestore.mockReset().mockResolvedValue({ ok: true, value: undefined });
		mockLogQuantity.mockReset().mockResolvedValue(WROTE);
		useToastStore.setState({ toast: null });
	});
	afterEach(() => jest.useRealTimers());

	it("toggles for today and confirms with an Undo that targets the same day", async () => {
		const { result } = await setup();
		await act(() => result.current.toggle(read));
		expect(mockToggle).toHaveBeenCalledWith(1, TODAY, true);
		const toast = useToastStore.getState().toast;
		expect(toast?.message).toBe("Marked 'Read' complete");
		jest.setSystemTime(new Date(2026, 9, 15, 9));
		toast?.onAction?.();
		expect(mockRestore).toHaveBeenLastCalledWith(1, TODAY, false, null);
	});

	it("skips a write when the render still shows yesterday", async () => {
		const { result } = await setup();
		jest.setSystemTime(new Date(2026, 9, 15, 0, 1));
		await act(() => result.current.toggle(read));
		expect(mockToggle).not.toHaveBeenCalled();
	});

	it("opens the quantity sheet on today with the day's amount, and closes it", async () => {
		const { result } = await setup(new Map([[2, 5]]));
		await act(() => result.current.openQuantitySheet(2));
		expect(result.current.quantitySheet).toMatchObject({
			habit: { id: 2 },
			value: 5,
			day: TODAY,
			offSchedule: false,
		});
		expect(result.current.quantitySheet?.dayLabel).toBeUndefined();

		await act(() => result.current.dismissQuantitySheet());
		expect(result.current.quantitySheet).toBeNull();
	});

	it("keeps the sheet's day when the clock passes midnight after it opened", async () => {
		const { result } = await setup(new Map([[2, 5]]));
		await act(() => result.current.openQuantitySheet(2));
		jest.setSystemTime(new Date(2026, 9, 15, 0, 1));
		expect(result.current.quantitySheet?.day).toEqual(TODAY);
	});

	describe("an open sheet across midnight (SY5)", () => {
		const SATURDAY = new Date(2026, 9, 15);

		it("keeps its day, its amount and says the day in its title once Today has moved on", async () => {
			const { result, rerender } = await setup(new Map([[2, 5]]));
			await act(() => result.current.openQuantitySheet(2));
			expect(result.current.quantitySheet?.dayLabel).toBeUndefined();

			mockEntries = [
				{ habitId: 2, date: "2026-10-14", value: 5 },
				{ habitId: 2, date: "2026-10-15", value: 1 },
			];
			await rerender({ today: SATURDAY });

			expect(result.current.quantitySheet).toMatchObject({
				day: TODAY,
				value: 5,
				dayLabel: "Wed 14 Oct",
			});
		});

		it("follows a change made to its own day while open", async () => {
			const { result, rerender } = await setup(new Map([[2, 5]]));
			await act(() => result.current.openQuantitySheet(2));
			mockEntries = [{ habitId: 2, date: "2026-10-14", value: 7 }];
			await rerender({ today: SATURDAY });
			expect(result.current.quantitySheet?.value).toBe(7);
		});

		it("a sheet closed after midnight leaves nothing behind", async () => {
			const { result, rerender } = await setup(new Map([[2, 5]]));
			await act(() => result.current.openQuantitySheet(2));
			await rerender({ today: SATURDAY });
			await act(() => result.current.dismissQuantitySheet());
			expect(result.current.quantitySheet).toBeNull();
		});
	});

	it("does not open the sheet on a render that still shows yesterday", async () => {
		const { result } = await setup(new Map([[2, 5]]));
		jest.setSystemTime(new Date(2026, 9, 15, 0, 1));
		await act(() => result.current.openQuantitySheet(2));
		expect(result.current.quantitySheet).toBeNull();
	});

	it("+1 writes previous + 1 and Undo writes previous, captured at tap time", async () => {
		const { result } = await setup(new Map([[2, 3]]));
		await act(() => result.current.addOne(water));
		expect(mockLogQuantity).toHaveBeenCalledWith(2, TODAY, 4, 8);
		const toast = useToastStore.getState().toast;
		expect(toast?.message).toBe("Water +1 · 4 of 8 glasses");
		toast?.onAction?.();
		expect(mockRestore).toHaveBeenLastCalledWith(2, TODAY, 3, null);
	});

	it("+1 from nothing starts at 1; Undo then removes the entry (writes 0)", async () => {
		const { result } = await setup();
		await act(() => result.current.addOne(water));
		expect(mockLogQuantity).toHaveBeenCalledWith(2, TODAY, 1, 8);
		useToastStore.getState().toast?.onAction?.();
		expect(mockRestore).toHaveBeenLastCalledWith(2, TODAY, 0, null);
	});

	it("two quick +1 taps before the screen re-reads add up: 1 then 2, each Undo to its own previous", async () => {
		const { result } = await setup(new Map([[2, 3]]));
		await act(async () => {
			await result.current.addOne(water);
			await result.current.addOne(water);
		});
		expect(mockLogQuantity).toHaveBeenNthCalledWith(1, 2, TODAY, 4, 8);
		expect(mockLogQuantity).toHaveBeenNthCalledWith(2, 2, TODAY, 5, 8);
		useToastStore.getState().toast?.onAction?.();
		expect(mockRestore).toHaveBeenLastCalledWith(2, TODAY, 4, null);
	});

	it("a failed +1 does not leave a phantom amount for the next tap", async () => {
		mockLogQuantity.mockResolvedValueOnce({ ok: false });
		const { result } = await setup(new Map([[2, 3]]));
		await act(() => result.current.addOne(water));
		await act(() => result.current.addOne(water));
		expect(mockLogQuantity).toHaveBeenLastCalledWith(2, TODAY, 4, 8);
	});

	it("+1 keeps counting above the target", async () => {
		const { result } = await setup(new Map([[2, 8]]));
		await act(() => result.current.addOne(water));
		expect(mockLogQuantity).toHaveBeenCalledWith(2, TODAY, 9, 8);
		expect(useToastStore.getState().toast?.message).toBe(
			"Water +1 · 9 of 8 glasses",
		);
	});

	it("+1 shows no toast when the write fails (the hook has already toasted the error)", async () => {
		mockLogQuantity.mockResolvedValue({ ok: false });
		const { result } = await setup();
		await act(() => result.current.addOne(water));
		expect(useToastStore.getState().toast).toBeNull();
	});

	it("+1 on a past day writes to that date and names it", async () => {
		const { result } = await setup(new Map([[2, 1]]), "2026-10-12");
		await act(() => result.current.addOne(water));
		expect(mockLogQuantity).toHaveBeenCalledWith(
			2,
			new Date(2026, 9, 12),
			2,
			8,
		);
		expect(useToastStore.getState().toast?.message).toBe(
			"Water +1 · 2 of 8 glasses · Mon 12 Oct",
		);
	});

	it("logs a rest-day check at once, and hands a quantity habit to the sheet", async () => {
		const { result } = await setup();
		await act(() => result.current.logOffSchedule(read));
		expect(useToastStore.getState().toast?.message).toBe(
			"Logged 'Read' · off-schedule",
		);
		await act(() => result.current.logOffSchedule(water));
		expect(result.current.quantitySheet).toMatchObject({
			habit: { id: 2 },
			offSchedule: true,
		});
		expect(mockToggle).toHaveBeenCalledTimes(1);
	});

	describe("with a past day selected", () => {
		const PAST = "2026-10-12";
		const PAST_DATE = new Date(2026, 9, 12);

		it("writes to that date, names it in the toast, and Undo targets it too", async () => {
			const { result } = await setup(new Map(), PAST);
			await act(() => result.current.toggle(read));
			expect(mockToggle).toHaveBeenCalledWith(1, PAST_DATE, true);
			const toast = useToastStore.getState().toast;
			expect(toast?.message).toBe("Marked 'Read' complete · Mon 12 Oct");
			toast?.onAction?.();
			expect(mockRestore).toHaveBeenLastCalledWith(1, PAST_DATE, false, null);
		});

		it("is not skipped when the day has rolled over since the render", async () => {
			const { result } = await setup(new Map(), PAST);
			jest.setSystemTime(new Date(2026, 9, 15, 0, 1));
			await act(() => result.current.toggle(read));
			expect(mockToggle).toHaveBeenCalledWith(1, PAST_DATE, true);
		});

		it("opens the quantity sheet on that date, and names it", async () => {
			const { result } = await setup(new Map([[2, 5]]), PAST);
			await act(() => result.current.openQuantitySheet(2));
			expect(result.current.quantitySheet).toMatchObject({
				day: PAST_DATE,
				dayLabel: "Mon 12 Oct",
			});
		});
	});

	describe("a write that gives a frozen day's freeze back", () => {
		const FREEZE = {
			id: 9,
			habitId: 1,
			date: "2026-10-12",
			createdAt: new Date(2026, 9, 13, 7),
		};

		it("says the freeze was returned instead, and Undo hands the freeze back to the restore", async () => {
			mockToggle.mockResolvedValue({
				ok: true,
				value: { returnedFreeze: FREEZE, freezesLeft: 1 },
			});
			const { result } = await setup(new Map(), "2026-10-12");
			await act(() => result.current.toggle(read));

			const toast = useToastStore.getState().toast;
			expect(toast?.message).toBe("Freeze returned for Mon 12 · 1 left");
			toast?.onAction?.();
			expect(mockRestore).toHaveBeenLastCalledWith(
				1,
				new Date(2026, 9, 12),
				false,
				FREEZE,
			);
		});
	});
});
