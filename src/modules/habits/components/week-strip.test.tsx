import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { surfaceColors } from "@/theme/theme";
import type { WeekStripDay } from "../domain/week-strip";
import { WeekStrip } from "./week-strip";

const light = surfaceColors.light;

function week(allDoneKeys: string[] = []): WeekStripDay[] {
	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(2026, 9, 19 + index);
		const key = `2026-10-${19 + index}`;
		return {
			date,
			key,
			isToday: index === 4,
			isFuture: index > 4,
			allDone: allDoneKeys.includes(key),
		};
	});
}

function setup(
	overrides: Partial<React.ComponentProps<typeof WeekStrip>> = {},
) {
	const handlers = {
		onSelect: jest.fn(),
		onStepDay: jest.fn(),
		onPreviousWeek: jest.fn(),
		onNextWeek: jest.fn(),
	};
	const view = render(
		<WeekStrip
			days={week(["2026-10-19", "2026-10-20"])}
			selectedKey="2026-10-23"
			selectedSummary="1 of 5 done"
			direction={0}
			{...handlers}
			{...overrides}
		/>,
	);
	return { view, ...handlers };
}

describe("WeekStrip (V3-03)", () => {
	it("shows seven days Monday first", async () => {
		await setup().view;
		expect(screen.getByText("19")).toBeTruthy();
		expect(screen.getByText("25")).toBeTruthy();
		expect(screen.getAllByTestId(/week-strip-day-/)).toHaveLength(7);
	});

	it("fills the selected day with the accent", async () => {
		await setup().view;
		const selected = StyleSheet.flatten(
			screen.getByTestId("week-strip-number-2026-10-23").props.style,
		);
		expect(selected.backgroundColor).toBe(light.accent);
	});

	it("rings today, selected or not", async () => {
		await setup({ selectedKey: "2026-10-21" }).view;
		const today = StyleSheet.flatten(
			screen.getByTestId("week-strip-number-2026-10-23").props.style,
		);
		expect(today.borderWidth).toBe(2);
		expect(today.backgroundColor).toBeUndefined();
		const other = StyleSheet.flatten(
			screen.getByTestId("week-strip-number-2026-10-22").props.style,
		);
		expect(other.borderWidth).toBeUndefined();
	});

	it("dots only the days whose due habits were all done", async () => {
		await setup().view;
		expect(screen.getAllByTestId("week-strip-dot")).toHaveLength(2);
	});

	it("selects a past day when tapped", async () => {
		const { view, onSelect } = setup();
		await view;
		await fireEvent.press(screen.getByTestId("week-strip-day-2026-10-21"));
		expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 21));
	});

	it("leaves a future day inert", async () => {
		const { view, onSelect } = setup();
		await view;
		const future = screen.getByTestId("week-strip-day-2026-10-24");
		expect(future.props.accessibilityState.disabled).toBe(true);
		await fireEvent.press(future);
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("is one adjustable VoiceOver element naming the day, today, selected and the progress", async () => {
		await setup().view;
		const strip = screen.getByTestId("week-strip");
		expect(strip.props.accessibilityRole).toBe("adjustable");
		expect(strip.props.accessibilityLabel).toBe(
			"Friday 23, today, selected, 1 of 5 done",
		);
	});

	it("steps a day with VoiceOver's increment and decrement", async () => {
		const { view, onStepDay } = setup();
		await view;
		const strip = screen.getByTestId("week-strip");
		await act(() =>
			strip.props.onAccessibilityAction({
				nativeEvent: { actionName: "increment" },
			}),
		);
		await act(() =>
			strip.props.onAccessibilityAction({
				nativeEvent: { actionName: "decrement" },
			}),
		);
		expect(onStepDay).toHaveBeenNthCalledWith(1, 1);
		expect(onStepDay).toHaveBeenNthCalledWith(2, -1);
	});

	it("names the week when the selection is in another week", async () => {
		await setup({ selectedKey: "2026-10-12" }).view;
		expect(screen.getByTestId("week-strip").props.accessibilityLabel).toBe(
			"Week of 19 October",
		);
	});

	it("gives each day a hit area of at least 44 pt", async () => {
		await setup().view;
		const day = StyleSheet.flatten(
			screen.getByTestId("week-strip-day-2026-10-19").props.style,
		);
		expect(day.minHeight).toBeGreaterThanOrEqual(44);
	});
});
