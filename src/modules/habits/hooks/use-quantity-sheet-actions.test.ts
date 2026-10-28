import { act, renderHook } from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";
import { makeHabit } from "../test-support/habit-builder";

const mockLogQuantity = jest.fn();
const mockRestoreDay = jest.fn();
jest.mock("./use-quantity-log-actions", () => ({
	useQuantityLogActions: () => ({ logQuantity: mockLogQuantity }),
}));
jest.mock("./use-today-actions", () => ({
	useTodayActions: () => ({ restoreDay: mockRestoreDay }),
}));

import { useQuantitySheetActions } from "./use-quantity-sheet-actions";

const DAY = new Date(2026, 9, 23);
const water = makeHabit({
	id: 2,
	name: "Drink water",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});
const WROTE = { ok: true, value: { returnedFreeze: null, freezesLeft: 2 } };
const toast = () => useToastStore.getState().toast;

function setup(initial: number, extra: Record<string, unknown> = {}) {
	const onClosed = jest.fn();
	const view = renderHook(() =>
		useQuantitySheetActions({
			habit: water,
			day: DAY,
			initial,
			onClosed,
			...extra,
		}),
	);
	return { view, onClosed };
}

describe("useQuantitySheetActions (QS1-QS3)", () => {
	beforeEach(() => {
		mockLogQuantity.mockReset().mockResolvedValue(WROTE);
		mockRestoreDay
			.mockReset()
			.mockResolvedValue({ ok: true, value: undefined });
		useToastStore.setState({ toast: null });
	});

	it("saves every change at once, in order", async () => {
		const { view } = setup(5);
		const { result } = await view;
		await act(async () => {
			result.current.setAmount(6);
			result.current.setAmount(7);
		});
		expect(mockLogQuantity).toHaveBeenNthCalledWith(1, 2, DAY, 6, 8);
		expect(mockLogQuantity).toHaveBeenNthCalledWith(2, 2, DAY, 7, 8);
		expect(result.current.amount).toBe(7);
	});

	it("shows one toast on close, naming the final amount, and Undo restores the amount from before the sheet opened", async () => {
		const { view, onClosed } = setup(5);
		const { result } = await view;
		await act(async () => {
			result.current.setAmount(6);
			result.current.setAmount(7);
			await result.current.close();
		});
		expect(onClosed).toHaveBeenCalledTimes(1);
		expect(toast()).toMatchObject({
			message: "Drink water · 7 of 8 glasses",
			actionLabel: "Undo",
		});
		toast()?.onAction?.();
		expect(mockRestoreDay).toHaveBeenCalledWith(2, DAY, 5, null);
	});

	it("shows no toast when nothing changed, or when the amount came back to where it started", async () => {
		const { view, onClosed } = setup(5);
		const { result } = await view;
		await act(async () => {
			result.current.setAmount(6);
			result.current.setAmount(5);
			await result.current.close();
		});
		expect(toast()).toBeNull();
		expect(onClosed).toHaveBeenCalled();
	});

	it("says the habit is complete when the sheet crossed the target", async () => {
		const { view } = setup(5);
		const { result } = await view;
		await act(async () => {
			result.current.setAmount(8);
			await result.current.close();
		});
		expect(toast()?.message).toBe("Marked 'Drink water' complete");
	});

	it("says not complete when it dropped back under", async () => {
		const { view } = setup(8);
		const { result } = await view;
		await act(async () => {
			result.current.setAmount(4);
			await result.current.close();
		});
		expect(toast()?.message).toBe("Marked 'Drink water' not complete");
	});

	it("keeps counting above the target and says so plainly", async () => {
		const { view } = setup(8);
		const { result } = await view;
		await act(async () => {
			result.current.setAmount(10);
			await result.current.close();
		});
		expect(toast()?.message).toBe("Drink water · 10 of 8 glasses");
	});

	it("names a past day in the toast", async () => {
		const { view } = setup(5, { dayLabel: "Wed 21 Oct" });
		const { result } = await view;
		await act(async () => {
			result.current.setAmount(6);
			await result.current.close();
		});
		expect(toast()?.message).toBe("Drink water · 6 of 8 glasses · Wed 21 Oct");
	});

	it("says the freeze came back when a write returned one, and Undo puts both back", async () => {
		const frozen = { habitId: 2, date: "2026-10-23", createdAt: DAY };
		mockLogQuantity.mockResolvedValue({
			ok: true,
			value: { returnedFreeze: frozen, freezesLeft: 1 },
		});
		const { view } = setup(5);
		const { result } = await view;
		await act(async () => {
			result.current.setAmount(8);
			await result.current.close();
		});
		expect(toast()?.message).toBe("Freeze returned for Fri 23 · 1 left");
		toast()?.onAction?.();
		expect(mockRestoreDay).toHaveBeenCalledWith(2, DAY, 5, frozen);
	});

	it("shows what is really saved when a write fails, and no toast for it", async () => {
		const { view } = setup(5);
		const { result } = await view;
		mockLogQuantity.mockResolvedValueOnce({
			ok: false,
			error: new Error("disk"),
		});
		await act(async () => {
			result.current.setAmount(6);
			await result.current.close();
		});
		expect(result.current.amount).toBe(5);
		expect(toast()).toBeNull();
	});

	it("clamps to the allowed range", async () => {
		const { view } = setup(1);
		const { result } = await view;
		await act(async () => {
			result.current.setAmount(-3);
		});
		expect(mockLogQuantity).toHaveBeenLastCalledWith(2, DAY, 0, 8);
	});

	it("words a bonus log as a bonus", async () => {
		const { view } = setup(0, { offSchedule: true });
		const { result } = await view;
		await act(async () => {
			result.current.setAmount(2);
			await result.current.close();
		});
		expect(toast()?.message).toBe("Logged 'Drink water' · off-schedule");
	});
});
