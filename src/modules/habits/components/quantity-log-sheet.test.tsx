import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";
import { motion } from "@/theme/theme";
import { makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockLogQuantity = jest.fn();
const mockRestoreDay = jest.fn();
jest.mock("../hooks/use-quantity-log-actions", () => ({
	useQuantityLogActions: () => ({ logQuantity: mockLogQuantity }),
}));
jest.mock("../hooks/use-today-actions", () => ({
	useTodayActions: () => ({ restoreDay: mockRestoreDay }),
}));

import { QuantityLogSheet } from "./quantity-log-sheet";

const DAY = new Date(2026, 9, 23);
const habit = makeHabit({
	id: 2,
	name: "Drink water",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});
const WROTE = { ok: true, value: { returnedFreeze: null, freezesLeft: 2 } };

async function open(value = 5, extra: Record<string, unknown> = {}) {
	const onClosed = jest.fn();
	await render(
		<QuantityLogSheet
			habit={habit}
			value={value}
			day={DAY}
			onClosed={onClosed}
			{...extra}
		/>,
	);
	return { onClosed };
}

describe("QuantityLogSheet (QS1-QS3)", () => {
	beforeEach(() => {
		mockLogQuantity.mockReset().mockResolvedValue(WROTE);
		mockRestoreDay
			.mockReset()
			.mockResolvedValue({ ok: true, value: undefined });
		useToastStore.setState({ toast: null });
		jest.useFakeTimers();
	});
	afterEach(() => jest.useRealTimers());

	it("titles the sheet with the habit name as a heading and shows the amount of the target", async () => {
		await open();
		expect(screen.getByRole("header", { name: "Drink water" })).toBeTruthy();
		expect(screen.getByText("of 8 glasses")).toBeTruthy();
		expect(screen.getByLabelText("glasses").props.accessibilityValue.now).toBe(
			5,
		);
	});

	it("names a past day in the title", async () => {
		await open(5, { dayLabel: "Wed 21 Oct" });
		expect(
			screen.getByRole("header", { name: "Drink water · Wed 21 Oct" }),
		).toBeTruthy();
	});

	it("steps with 44 pt buttons and saves each change at once", async () => {
		await open();
		await fireEvent.press(screen.getByLabelText("Increase glasses"));
		expect(mockLogQuantity).toHaveBeenLastCalledWith(2, DAY, 6, 8);
		await fireEvent.press(screen.getByLabelText("Decrease glasses"));
		expect(mockLogQuantity).toHaveBeenLastCalledWith(2, DAY, 5, 8);
	});

	it("offers +1, +2, +3 and Fill to the target", async () => {
		await open();
		await fireEvent.press(screen.getByText("+3"));
		expect(mockLogQuantity).toHaveBeenLastCalledWith(2, DAY, 8, 8);
	});

	it("Fill to 8 jumps to the target", async () => {
		await open(2);
		await fireEvent.press(screen.getByText("Fill to 8"));
		expect(mockLogQuantity).toHaveBeenLastCalledWith(2, DAY, 8, 8);
	});

	it("at the target Fill is disabled, extra amounts still count, and Done closes", async () => {
		const { onClosed } = await open(8);
		expect(screen.getByText("of 8 glasses · done")).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Fill to 8" }).props.accessibilityState
				.disabled,
		).toBe(true);
		expect(
			screen.getByText(
				"Target reached — the circle is full. Extra glasses still count.",
			),
		).toBeTruthy();
		await fireEvent.press(screen.getByLabelText("Increase glasses"));
		expect(mockLogQuantity).toHaveBeenLastCalledWith(2, DAY, 9, 8);
		await act(async () => {
			await fireEvent.press(screen.getByText("Done"));
		});
		expect(onClosed).not.toHaveBeenCalled();
		await act(() => jest.advanceTimersByTime(motion.sheet.duration));
		expect(onClosed).toHaveBeenCalledTimes(1);
	});

	it("closing shows one toast, and Undo restores the amount from before the sheet opened", async () => {
		const { onClosed } = await open(5);
		await fireEvent.press(screen.getByLabelText("Increase glasses"));
		await fireEvent.press(screen.getByLabelText("Increase glasses"));
		await act(async () => {
			await fireEvent.press(screen.getByText("Close"));
		});
		expect(onClosed).not.toHaveBeenCalled();
		await act(() => jest.advanceTimersByTime(motion.sheet.duration));
		expect(onClosed).toHaveBeenCalledTimes(1);
		expect(useToastStore.getState().toast).toMatchObject({
			message: "Drink water · 7 of 8 glasses",
			actionLabel: "Undo",
		});
		useToastStore.getState().toast?.onAction?.();
		expect(mockRestoreDay).toHaveBeenCalledWith(2, DAY, 5, null);
	});

	describe("Set exact value (QS2)", () => {
		async function openExact(value = 5) {
			const view = await open(value);
			await fireEvent.press(screen.getByText("Set exact value"));
			return view;
		}

		it("opens the number pad on a field labelled with the unit, and says the target and the limit", async () => {
			await openExact();
			const field = screen.getByLabelText("glasses today");
			expect(field.props.keyboardType).toBe("number-pad");
			expect(field.props.autoFocus).toBe(true);
			expect(screen.getByText("Target 8 · up to 9999")).toBeTruthy();
		});

		it("'Set to 6' logs the difference and returns to the stepper", async () => {
			await openExact(5);
			await fireEvent.changeText(screen.getByLabelText("glasses today"), "6");
			await fireEvent.press(screen.getByText("Set to 6"));
			expect(mockLogQuantity).toHaveBeenLastCalledWith(2, DAY, 6, 8);
			expect(
				screen.getByLabelText("glasses").props.accessibilityValue.now,
			).toBe(6);
		});

		it("takes digits only and disables Set while the value is unchanged", async () => {
			await openExact(5);
			expect(
				screen.getByRole("button", { name: "Set to 5" }).props
					.accessibilityState.disabled,
			).toBe(true);
			await fireEvent.changeText(screen.getByLabelText("glasses today"), "1a2");
			expect(screen.getByLabelText("glasses today").props.value).toBe("12");
		});
	});
});
