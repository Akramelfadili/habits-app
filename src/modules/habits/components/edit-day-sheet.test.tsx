import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";
import type { RetroLogDay } from "../hooks/use-retro-log-queries";
import { makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockToggle = jest.fn();
const mockRestore = jest.fn();
const mockSaveNote = jest.fn();
const mockLogQuantity = jest.fn();
jest.mock("../hooks/use-today-actions", () => ({
	useTodayActions: () => ({
		toggleCompletion: mockToggle,
		restoreDay: mockRestore,
	}),
}));
jest.mock("../hooks/use-day-note-actions", () => ({
	useDayNoteActions: () => ({ saveNote: mockSaveNote }),
}));
jest.mock("../hooks/use-quantity-log-actions", () => ({
	useQuantityLogActions: () => ({ logQuantity: mockLogQuantity }),
}));

import { EditDaySheet } from "./edit-day-sheet";

const DATE = new Date(2026, 9, 21);
const read = makeHabit({ id: 1, name: "Read 20 min" });
const water = makeHabit({
	id: 2,
	name: "Drink water",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});
const WROTE = { ok: true, value: { returnedFreeze: null, freezesLeft: 2 } };

function dayOf(overrides: Partial<RetroLogDay> = {}): RetroLogDay {
	return {
		date: DATE,
		habits: [read, water],
		values: { 1: false, 2: 5 },
		frozenHabitIds: new Set(),
		originHabitId: 1,
		note: "",
		...overrides,
	};
}

const toast = () => useToastStore.getState().toast;

describe("EditDaySheet (RL1-RL3)", () => {
	beforeEach(() => {
		jest.useFakeTimers({ now: new Date(2026, 9, 23, 12) });
		mockToggle.mockReset().mockResolvedValue(WROTE);
		mockRestore.mockReset().mockResolvedValue({ ok: true, value: undefined });
		mockSaveNote.mockReset().mockResolvedValue({ ok: true, value: undefined });
		mockLogQuantity.mockReset().mockResolvedValue(WROTE);
		useToastStore.setState({ toast: null, openSheets: 0 });
	});
	afterEach(() => jest.useRealTimers());

	it("titles the sheet with the date and lists every habit due that day", async () => {
		await render(<EditDaySheet day={dayOf()} onDismiss={jest.fn()} />);
		expect(
			screen.getByRole("header", { name: "Wednesday, 21 October" }),
		).toBeTruthy();
		expect(screen.getByText("Read 20 min")).toBeTruthy();
		expect(screen.getByText("Missed · tap to log")).toBeTruthy();
		expect(screen.getByText("5 of 8 glasses · tap for amount")).toBeTruthy();
	});

	it("saves a tap at once for that date, and the toast names the date with Undo", async () => {
		await render(<EditDaySheet day={dayOf()} onDismiss={jest.fn()} />);
		await fireEvent.press(screen.getByLabelText("Read 20 min, not done"));

		expect(mockToggle).toHaveBeenCalledWith(1, DATE, true);
		expect(toast()).toMatchObject({
			message: "Read 20 min logged for Wed 21",
			actionLabel: "Undo",
		});
		toast()?.onAction?.();
		expect(mockRestore).toHaveBeenCalledWith(1, DATE, false, null);
	});

	it("clears a done habit with an Undo that puts it back", async () => {
		await render(
			<EditDaySheet
				day={dayOf({ values: { 1: true, 2: 5 } })}
				onDismiss={jest.fn()}
			/>,
		);
		await fireEvent.press(screen.getByLabelText("Read 20 min, done"));

		expect(mockToggle).toHaveBeenCalledWith(1, DATE, false);
		expect(toast()?.message).toBe("Read 20 min cleared for Wed 21");
		toast()?.onAction?.();
		expect(mockRestore).toHaveBeenCalledWith(1, DATE, true, null);
	});

	it("words a Break habit as resisted", async () => {
		const brk = makeHabit({
			id: 3,
			name: "No social media",
			direction: "break",
		});
		await render(
			<EditDaySheet
				day={dayOf({ habits: [brk], values: { 3: false } })}
				onDismiss={jest.fn()}
			/>,
		);
		await fireEvent.press(screen.getByLabelText("No social media, resisted?"));
		expect(toast()?.message).toBe("No social media resisted on Wed 21");
	});

	it("opens the quantity sheet for that date from a quantity row", async () => {
		await render(<EditDaySheet day={dayOf()} onDismiss={jest.fn()} />);
		await fireEvent.press(screen.getByLabelText("Amount, 5 of 8"));
		expect(
			screen.getByRole("header", { name: "Drink water · Wed 21 Oct" }),
		).toBeTruthy();
		await fireEvent.press(screen.getByLabelText("Increase glasses"));
		expect(mockLogQuantity).toHaveBeenCalledWith(2, DATE, 6, 8);
		expect(mockToggle).not.toHaveBeenCalled();
	});

	it("shows a frozen day with the violet circle, and logging it says the freeze came back", async () => {
		mockToggle.mockResolvedValue({
			ok: true,
			value: {
				returnedFreeze: { habitId: 1, date: "2026-10-21", createdAt: DATE },
				freezesLeft: 1,
			},
		});
		await render(
			<EditDaySheet
				day={dayOf({ frozenHabitIds: new Set([1]) })}
				onDismiss={jest.fn()}
			/>,
		);
		expect(
			screen.getByText("Frozen · logging it returns the freeze"),
		).toBeTruthy();
		await fireEvent.press(screen.getByLabelText("Read 20 min, not done"));
		expect(toast()?.message).toBe("Freeze returned for Wed 21 · 1 left");
	});

	it("shows no toast when the write failed", async () => {
		mockToggle.mockResolvedValue({ ok: false, error: new Error("disk") });
		await render(<EditDaySheet day={dayOf()} onDismiss={jest.fn()} />);
		await fireEvent.press(screen.getByLabelText("Read 20 min, not done"));
		expect(toast()).toBeNull();
	});

	it("does not list habits before they started: an empty day says nothing was due", async () => {
		await render(
			<EditDaySheet
				day={dayOf({ habits: [], values: {} })}
				onDismiss={jest.fn()}
			/>,
		);
		expect(screen.getByText("Nothing was due on this day.")).toBeTruthy();
	});

	it("does not edit a future day", async () => {
		await render(
			<EditDaySheet
				day={dayOf({ date: new Date(2026, 9, 25) })}
				onDismiss={jest.fn()}
			/>,
		);
		expect(
			screen.getByText("Can’t log ahead — pick today or an earlier day"),
		).toBeTruthy();
		expect(screen.queryByText("Read 20 min")).toBeNull();
	});

	it("shows the toast inside the sheet, above Done", async () => {
		await render(<EditDaySheet day={dayOf()} onDismiss={jest.fn()} />);
		await fireEvent.press(screen.getByLabelText("Read 20 min, not done"));
		expect(screen.getByText("Read 20 min logged for Wed 21")).toBeTruthy();
		expect(screen.getAllByText("Read 20 min logged for Wed 21")).toHaveLength(
			1,
		);
	});

	it("closes with Done", async () => {
		const onDismiss = jest.fn();
		await render(<EditDaySheet day={dayOf()} onDismiss={onDismiss} />);
		await act(async () => {
			await fireEvent.press(screen.getByText("Done"));
		});
		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(mockSaveNote).not.toHaveBeenCalled();
	});
});
