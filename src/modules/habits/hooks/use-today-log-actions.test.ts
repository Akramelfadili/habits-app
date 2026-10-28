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
	return renderHook(() =>
		useTodayLogActions({
			today: TODAY,
			selectedKey,
			completedHabitIds: new Set<number>(),
			quantityValuesByHabitId: values,
			loggableHabits: [read, water],
		}),
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

	it("opens and closes the quantity sheet, and a crossing save offers Undo to the previous amount", async () => {
		const { result } = await setup(new Map([[2, 5]]));
		await act(() => result.current.openQuantitySheet(2));
		expect(result.current.quantityHabit?.id).toBe(2);
		expect(result.current.quantityValue).toBe(5);

		await act(() => result.current.saveQuantity(8));

		expect(mockLogQuantity).toHaveBeenCalledWith(2, TODAY, 8, 8);
		expect(result.current.quantityHabit).toBeUndefined();
		useToastStore.getState().toast?.onAction?.();
		expect(mockRestore).toHaveBeenLastCalledWith(2, TODAY, 5, null);
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
		expect(result.current.quantityHabit?.id).toBe(2);
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

		it("saves a quantity to that date", async () => {
			const { result } = await setup(new Map([[2, 5]]), PAST);
			await act(() => result.current.openQuantitySheet(2));
			await act(() => result.current.saveQuantity(8));
			expect(mockLogQuantity).toHaveBeenCalledWith(2, PAST_DATE, 8, 8);
			expect(useToastStore.getState().toast?.message).toBe(
				"Marked 'Water' complete · Mon 12 Oct",
			);
		});
	});

	describe("a write that gives a frozen day's freeze back (PR-11)", () => {
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

		it("also for a quantity amount that reaches the target", async () => {
			mockLogQuantity.mockResolvedValue({
				ok: true,
				value: { returnedFreeze: { ...FREEZE, habitId: 2 }, freezesLeft: 2 },
			});
			const { result } = await setup(new Map([[2, 7]]), "2026-10-12");
			await act(() => result.current.openQuantitySheet(2));
			await act(() => result.current.saveQuantity(8));

			expect(useToastStore.getState().toast?.message).toBe(
				"Freeze returned for Mon 12 · 2 left",
			);
			useToastStore.getState().toast?.onAction?.();
			expect(mockRestore).toHaveBeenLastCalledWith(
				2,
				new Date(2026, 9, 12),
				7,
				expect.objectContaining({ habitId: 2 }),
			);
		});
	});
});
