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
			due: index > 4 ? 0 : 5,
			done: allDoneKeys.includes(key) ? 5 : 3,
		};
	});
}

function setup(
	overrides: Partial<React.ComponentProps<typeof WeekStrip>> = {},
) {
	const handlers = {
		onSelect: jest.fn(),
		onPreviousWeek: jest.fn(),
		onNextWeek: jest.fn(),
	};
	const view = render(
		<WeekStrip
			days={week(["2026-10-19", "2026-10-20"])}
			selectedKey="2026-10-23"
			canShowNext
			{...handlers}
			{...overrides}
		/>,
	);
	return { view, ...handlers };
}

// jest's window reports fontScale 2, i.e. accessibility sizes: say which one a test wants.
let mockAccessibilityText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockAccessibilityText,
}));

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

	it("makes every day its own VoiceOver button with a label, selected state and hint", async () => {
		await setup().view;
		expect(screen.getByTestId("week-strip").props.accessible).not.toBe(true);
		const today = screen.getByTestId("week-strip-day-2026-10-23");
		expect(today.props.accessibilityRole).toBe("button");
		expect(today.props.accessibilityLabel).toBe(
			"Friday 23 October, today, 3 of 5 done",
		);
		expect(today.props.accessibilityState).toEqual({
			selected: true,
			disabled: false,
		});
		expect(today.props.accessibilityHint).toBeTruthy();
		const other = screen.getByTestId("week-strip-day-2026-10-19");
		expect(other.props.accessibilityLabel).toBe(
			"Monday 19 October, 5 of 5 done",
		);
		expect(other.props.accessibilityState.selected).toBe(false);
		const future = screen.getByTestId("week-strip-day-2026-10-24");
		expect(future.props.accessibilityLabel).toBe("Saturday 24 October");
	});

	it("reaches other weeks through VoiceOver actions on any day", async () => {
		const { view, onPreviousWeek, onNextWeek } = setup();
		await view;
		const day = screen.getByTestId("week-strip-day-2026-10-20");
		expect(
			day.props.accessibilityActions.map((a: { name: string }) => a.name),
		).toEqual(["previousWeek", "nextWeek"]);
		await act(() =>
			day.props.onAccessibilityAction({
				nativeEvent: { actionName: "previousWeek" },
			}),
		);
		await act(() =>
			day.props.onAccessibilityAction({
				nativeEvent: { actionName: "nextWeek" },
			}),
		);
		expect(onPreviousWeek).toHaveBeenCalledTimes(1);
		expect(onNextWeek).toHaveBeenCalledTimes(1);
	});

	it("gives each day a hit area of at least 44 pt", async () => {
		await setup().view;
		const day = StyleSheet.flatten(
			screen.getByTestId("week-strip-day-2026-10-19").props.style,
		);
		expect(day.minHeight).toBeGreaterThanOrEqual(44);
	});
});

describe("WeekStrip at accessibility text sizes (08.6)", () => {
	beforeEach(() => {
		mockAccessibilityText = true;
	});
	afterEach(() => {
		mockAccessibilityText = false;
	});

	it("collapses to one 'Friday 23 · Change day' button", async () => {
		await setup().view;
		expect(screen.queryByTestId("week-strip")).toBeNull();
		expect(
			screen.getByRole("button", { name: "Friday 23 · Change day" }),
		).toBeTruthy();
	});

	it("opens the week as a list and selects from it", async () => {
		const { view, onSelect } = setup();
		await view;
		await fireEvent.press(screen.getByTestId("week-strip-change-day"));
		await fireEvent.press(screen.getByLabelText("Tuesday 20 October"));
		expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 20));
	});
});
