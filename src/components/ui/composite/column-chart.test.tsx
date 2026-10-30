import { fireEvent, render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { type ChartColumn, ColumnChart } from "./column-chart";

const light = { ...surfaceColors.light, ...semanticColors.light };

const columns: ChartColumn[] = [
	{
		key: "jan",
		value: 0,
		state: "before-start",
		label: "J",
		accessibilityLabel: "January, before you started",
	},
	{
		key: "feb",
		value: 0.8,
		label: "F",
		accessibilityLabel: "February, 80 percent",
	},
	{
		key: "mar",
		value: 1,
		label: "M",
		accessibilityLabel: "March, 100 percent",
	},
	{
		key: "apr",
		value: 0.5,
		state: "current",
		label: "A",
		accessibilityLabel: "April, 50 percent so far",
	},
	{
		key: "may",
		value: 0,
		state: "future",
		label: "M",
		accessibilityLabel: "May, not yet",
	},
];

describe("ColumnChart", () => {
	it("draws a column per period at 96 pt, before-start dashed, future outlined, current lighter", async () => {
		await render(<ColumnChart columns={columns} summary="Year" />);
		expect(
			screen.getByTestId("chart-bar-before-start", {
				includeHiddenElements: true,
			}),
		).toHaveStyle({ borderStyle: "dashed" });
		expect(
			screen.getByTestId("chart-bar-future", { includeHiddenElements: true }),
		).toHaveStyle({ borderStyle: "solid", borderColor: light.border });
		expect(
			screen.getByTestId("chart-bar-current", { includeHiddenElements: true }),
		).toHaveStyle({ backgroundColor: light.faint });
		const full = screen.getAllByTestId("chart-bar-complete", {
			includeHiddenElements: true,
		});
		expect(full[1]).toHaveStyle({ height: 96, backgroundColor: light.ink });
	});

	it("sets the current column's label in ink and heavier", async () => {
		await render(<ColumnChart columns={columns} summary="Year" />);
		expect(screen.getByText("A", { includeHiddenElements: true })).toHaveStyle({
			fontWeight: "600",
			color: light.ink,
		});
	});

	it("reads as one adjustable summary whose value steps from bar to bar", async () => {
		await render(
			<ColumnChart
				columns={columns}
				summary="Meditate, best March 100 percent"
			/>,
		);
		const chart = screen.getByLabelText("Meditate, best March 100 percent");
		expect(chart.props.accessibilityRole).toBe("adjustable");
		expect(chart.props.accessibilityValue).toEqual({
			text: "January, before you started",
		});
		await fireEvent(chart, "accessibilityAction", {
			nativeEvent: { actionName: "increment" },
		});
		expect(
			screen.getByLabelText("Meditate, best March 100 percent").props
				.accessibilityValue,
		).toEqual({ text: "February, 80 percent" });
		await fireEvent(chart, "accessibilityAction", {
			nativeEvent: { actionName: "decrement" },
		});
		await fireEvent(chart, "accessibilityAction", {
			nativeEvent: { actionName: "decrement" },
		});
		// Clamped at the first bar.
		expect(
			screen.getByLabelText("Meditate, best March 100 percent").props
				.accessibilityValue,
		).toEqual({ text: "January, before you started" });
	});

	it("puts a second line under the axis when a column has a value label", async () => {
		await render(
			<ColumnChart
				columns={[{ ...columns[1], valueLabel: "83%" }]}
				summary="Week"
			/>,
		);
		expect(
			screen.getByText("83%", { includeHiddenElements: true }),
		).toBeTruthy();
	});
});
