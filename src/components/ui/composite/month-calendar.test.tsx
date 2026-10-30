import { fireEvent, render, screen } from "@testing-library/react-native";
import { MonthCalendar } from "./month-calendar";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

describe("MonthCalendar", () => {
	it("draws 40 pt days with their numbers under a Monday-first axis", async () => {
		const weeks = [
			[
				null,
				null,
				{ key: "1", text: "1", state: { kind: "level", level: 3 } },
				{ key: "2", text: "2", state: { kind: "level", level: 1 } },
				{ key: "3", text: "3", state: { kind: "future" } },
				{ key: "4", text: "4", state: { kind: "future" } },
				{ key: "5", text: "5", state: { kind: "future" } },
			],
		] as const;
		await render(<MonthCalendar letters={LETTERS} weeks={weeks as never} />);
		expect(
			screen.getAllByText("M", { includeHiddenElements: true }),
		).toHaveLength(1);
		expect(screen.getByText("1")).toBeTruthy();
		const full = screen.getAllByTestId("completion-cell-level")[0];
		expect(full).toHaveStyle({ width: 40, height: 40 });
		// A partial day carries the notch: partial never depends on lightness.
		expect(screen.getAllByTestId("completion-cell-notch")).toHaveLength(1);
	});

	it("makes a day with onPress a button, rings the selected one, and opens it", async () => {
		const onPress = jest.fn();
		const weeks = [
			[
				{
					key: "14",
					text: "14",
					state: { kind: "level", level: 2 },
					selected: true,
					accessibilityLabel: "Tuesday 14 July, 80 percent",
					onPress,
				},
				null,
				null,
				null,
				null,
				null,
				null,
			],
		];
		await render(<MonthCalendar letters={LETTERS} weeks={weeks as never} />);
		const day = screen.getByRole("button", {
			name: "Tuesday 14 July, 80 percent",
		});
		expect(day.props.accessibilityState).toEqual(
			expect.objectContaining({ selected: true }),
		);
		await fireEvent.press(day);
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("hides the weekday letters from VoiceOver", async () => {
		await render(<MonthCalendar letters={LETTERS} weeks={[]} />);
		expect(screen.queryByText("M")).toBeNull();
		expect(screen.getByText("M", { includeHiddenElements: true })).toBeTruthy();
	});
});
