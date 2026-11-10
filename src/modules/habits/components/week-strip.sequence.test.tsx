import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { toDayKey } from "@/utils/day-key";
import { useWeekStripQueries } from "../hooks/use-week-strip-queries";
import { WeekStrip } from "./week-strip";

jest.mock("../repositories/habit-repository", () => ({
	useActiveHabits: () => {
		const { makeHabit } = require("../test-support/habit-builder");
		return {
			habits: [makeHabit({ id: 1, createdAt: new Date(2026, 8, 1) })],
			loaded: true,
		};
	},
}));
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: () => [],
}));
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

const TODAY = new Date(2026, 10, 4, 10);

/** Today's wiring: a selection (null follows today) feeding the real strip hook. */
function Harness() {
	const [selected, setSelected] = useState<Date | null>(null);
	const selectedDay = selected ?? TODAY;
	const strip = useWeekStripQueries(selectedDay, TODAY, setSelected);
	return (
		<>
			<Pressable testID="prev" onPress={strip.showPreviousWeek}>
				<Text>prev</Text>
			</Pressable>
			<Pressable testID="show-today" onPress={() => setSelected(null)}>
				<Text>today</Text>
			</Pressable>
			<WeekStrip
				days={strip.days}
				selectedKey={toDayKey(selectedDay)}
				onSelect={setSelected}
				onPreviousWeek={strip.showPreviousWeek}
				onNextWeek={strip.showNextWeek}
				canShowNext={strip.canShowNext}
			/>
		</>
	);
}

function stripOpacity() {
	const row = screen.getByTestId("week-strip").children[0];
	// biome-ignore lint/suspicious/noExplicitAny: reading the rendered style
	const style = (row as any).props.style;
	const flat = Object.assign({}, ...[style].flat(3).filter(Boolean));
	return flat.opacity;
}

describe("Today week strip: browse back, then tap a day", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("is fully visible after sliding back, tapping a day and scrolling on", async () => {
		await render(<Harness />);
		await fireEvent.press(screen.getByTestId("prev"));
		await act(() => jest.advanceTimersByTime(500));
		await fireEvent.press(screen.getByTestId("week-strip-day-2026-10-28"));
		await act(() => jest.advanceTimersByTime(500));
		expect(screen.getByTestId("week-strip-day-2026-10-26")).toBeTruthy();
		expect(stripOpacity()).toBe(1);
	});

	it("is fully visible when a day is tapped in the middle of the slide", async () => {
		await render(<Harness />);
		await fireEvent.press(screen.getByTestId("prev"));
		await act(() => jest.advanceTimersByTime(50));
		await fireEvent.press(screen.getByTestId("week-strip-day-2026-10-27"));
		await act(() => jest.advanceTimersByTime(500));
		expect(stripOpacity()).toBe(1);
	});

	it("always shows the week of the selected day, and Show today returns to the current week", async () => {
		await render(<Harness />);
		await fireEvent.press(screen.getByTestId("prev"));
		await act(() => jest.advanceTimersByTime(500));
		expect(
			screen.getByTestId("week-strip-day-2026-10-28").props.accessibilityState
				.selected,
		).toBe(true);
		await fireEvent.press(screen.getByTestId("show-today"));
		await act(() => jest.advanceTimersByTime(500));
		expect(screen.getByTestId("week-strip-day-2026-11-04")).toBeTruthy();
		expect(
			screen.getByTestId("week-strip-day-2026-11-04").props.accessibilityState
				.selected,
		).toBe(true);
	});
});
