import {
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { interactionOpacity } from "@/theme/theme";
import {
	bandRows,
	YEAR_CELL,
	type YearBand,
	YearHeatMap,
} from "./year-heat-map";

function column(prefix: string, weeks: number) {
	return Array.from({ length: weeks }, (_, week) =>
		Array.from({ length: 7 }, (_, day) => ({
			key: `${prefix}-${week}-${day}`,
			state: { kind: "level", level: 3 } as const,
			accessibilityLabel: "should stay silent",
		})),
	);
}

function band(key: string, weeks: number, onPress = jest.fn()): YearBand {
	return {
		key,
		months: [
			{
				key: `${key}-a`,
				label: "Jan ›",
				column: 0,
				accessibilityLabel: "January, 88 percent. Opens Month.",
				onPress,
			},
			{
				key: `${key}-b`,
				label: "Feb ›",
				column: 4,
				accessibilityLabel: "February, 90 percent. Opens Month.",
				onPress,
			},
		],
		columns: column(key, weeks),
	};
}

describe("YearHeatMap", () => {
	it("draws a column per week and a row per weekday in each band, at 16 pt", async () => {
		await render(
			<YearHeatMap bands={[band("a", 18), band("b", 18), band("c", 18)]} />,
		);
		expect(screen.getAllByTestId(/^year-band-[abc]$/)).toHaveLength(3);
		const cells = within(screen.getByTestId("year-band-a")).getAllByTestId(
			"completion-cell-level",
			{ includeHiddenElements: true },
		);
		expect(cells).toHaveLength(18 * 7);
		expect(cells[0]).toHaveStyle({ width: YEAR_CELL, height: YEAR_CELL });
	});

	it("transposes week columns into Monday-to-Sunday rows", () => {
		const rows = bandRows([
			[
				{ key: "m1", state: { kind: "future" } },
				null,
				null,
				null,
				null,
				null,
				null,
			],
			[
				{ key: "m2", state: { kind: "future" } },
				null,
				null,
				null,
				null,
				null,
				null,
			],
		]);
		expect(rows).toHaveLength(7);
		expect(rows[0].map((c) => c?.key)).toEqual(["m1", "m2"]);
		expect(rows[1]).toEqual([null, null]);
	});

	it("hides every day cell from VoiceOver and keeps the month labels as the only buttons", async () => {
		const onPress = jest.fn();
		await render(<YearHeatMap bands={[band("a", 18, onPress)]} />);
		expect(screen.queryByLabelText("should stay silent")).toBeNull();
		expect(screen.getAllByRole("button")).toHaveLength(2);
		await fireEvent.press(
			screen.getByRole("button", {
				name: "February, 90 percent. Opens Month.",
			}),
		);
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("dims a month label while it is pressed", async () => {
		await render(<YearHeatMap bands={[band("a", 18, jest.fn())]} />);
		const label = () =>
			screen.getByRole("button", {
				name: "February, 90 percent. Opens Month.",
			});
		expect(StyleSheet.flatten(label().props.style).opacity).toBeUndefined();
		await fireEvent(label(), "responderGrant", {
			nativeEvent: { touches: [], changedTouches: [] },
			touchHistory: { touchBank: [] },
			persist: jest.fn(),
			timeStamp: 0,
		});
		expect(StyleSheet.flatten(label().props.style).opacity).toBe(
			interactionOpacity.pressed,
		);
	});

	it("gives a month label a 44 pt target and sets it over its week column", async () => {
		await render(<YearHeatMap bands={[band("a", 18)]} />);
		const label = screen.getByTestId("year-month-a-b");
		const slop = label.props.hitSlop;
		expect(16 + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
		expect(label).toHaveStyle({ left: 4 * 18 });
	});

	it("shows one band when asked (Year too early)", async () => {
		await render(
			<YearHeatMap bands={[band("a", 18), band("b", 18)]} onlyBand={1} />,
		);
		expect(screen.queryByTestId("year-band-a")).toBeNull();
		expect(screen.getByTestId("year-band-b")).toBeTruthy();
	});
});
