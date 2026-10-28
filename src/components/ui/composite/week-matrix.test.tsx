import {
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react-native";
import type { CompletionRowsCell } from "./completion-rows";
import {
	type MatrixDayHeader,
	type MatrixRowData,
	type WeekBlockCell,
	WeekBlocks,
	WeekMatrix,
} from "./week-matrix";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const cell = (key: string): CompletionRowsCell => ({
	key,
	state: { kind: "level", level: 3 },
});

function days(onPress?: (key: string) => void): MatrixDayHeader[] {
	return LETTERS.map((letter, index) => ({
		key: `d${index}`,
		letter,
		today: index === 4,
		accessibilityLabel: `Day ${index + 1}. Edit this day`,
		onPress: onPress ? () => onPress(`d${index}`) : undefined,
	}));
}

const row = (key: string, met = false): MatrixRowData => ({
	key,
	name: "Drink water",
	dot: "#00aa88",
	total: "3/7",
	met,
	accessibilityLabel: "Drink water, 3 of 7. Monday, done. Tuesday, partial.",
	cells: LETTERS.map((_, index) => cell(`${key}-${index}`)),
});

describe("WeekMatrix", () => {
	it("draws seven 24 pt cells and the total for each habit", async () => {
		await render(<WeekMatrix days={days()} rows={[row("a"), row("b")]} />);
		const first = screen.getByTestId("week-matrix-row-a");
		expect(within(first).getAllByTestId("completion-cell-level")).toHaveLength(
			7,
		);
		expect(
			within(first).getAllByTestId("completion-cell-level")[0],
		).toHaveStyle({
			width: 24,
			height: 24,
		});
		expect(within(first).getByText("3/7")).toBeTruthy();
	});

	it("reads each habit as one VoiceOver stop with its days in the label", async () => {
		await render(<WeekMatrix days={days()} rows={[row("a")]} />);
		const stop = screen.getByLabelText(
			"Drink water, 3 of 7. Monday, done. Tuesday, partial.",
		);
		expect(stop.props.accessible).toBe(true);
	});

	it("makes only the day headers tappable, 44 pt high, and opens that day", async () => {
		const onPress = jest.fn();
		await render(<WeekMatrix days={days(onPress)} rows={[row("a")]} />);
		expect(screen.getAllByRole("button")).toHaveLength(7);
		const header = screen.getByTestId("week-matrix-day-d2");
		const slop = header.props.hitSlop;
		expect(16 + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
		await fireEvent.press(header);
		expect(onPress).toHaveBeenCalledWith("d2");
	});

	it("sets today's letter heavier and a met total heavier", async () => {
		await render(<WeekMatrix days={days()} rows={[row("a", true)]} />);
		expect(screen.getByText("F")).toHaveStyle({ fontWeight: "600" });
		expect(screen.getAllByText("M")[0]).not.toHaveStyle({ fontWeight: "600" });
		expect(screen.getByText("3/7")).toHaveStyle({ fontWeight: "600" });
	});
});

describe("WeekBlocks", () => {
	const blockCells: WeekBlockCell[] = LETTERS.map((letter, index) => ({
		...cell(`c${index}`),
		letter,
		text: String(19 + index),
		accessibilityLabel: `${letter}, done`,
	}));

	it("gives each habit a block of seven 40 pt cells with their dates", async () => {
		await render(
			<WeekBlocks
				blocks={[
					{
						key: "a",
						name: "Meditate",
						dot: "#8855cc",
						total: "3/7",
						cells: blockCells,
					},
				]}
			/>,
		);
		const cells = screen.getAllByTestId("completion-cell-level");
		expect(cells).toHaveLength(7);
		expect(cells[0]).toHaveStyle({ width: 40, height: 40 });
		expect(screen.getByText("19")).toBeTruthy();
		expect(screen.getByText("25")).toBeTruthy();
	});

	it("reads every cell on its own", async () => {
		await render(
			<WeekBlocks
				blocks={[
					{
						key: "a",
						name: "Meditate",
						dot: "#8855cc",
						total: "3/7",
						cells: blockCells,
					},
				]}
			/>,
		);
		expect(screen.getAllByLabelText(/, done$/)).toHaveLength(7);
	});

	it("shows a subline and a leading badge instead of the dot", async () => {
		await render(
			<WeekBlocks
				blocks={[
					{
						key: "a",
						name: "Meditate",
						dot: "#8855cc",
						subline: "Daily · your only habit",
						total: "3/3",
						leading: <></>,
						cells: blockCells,
					},
				]}
			/>,
		);
		expect(screen.getByText("Daily · your only habit")).toBeTruthy();
	});
});
