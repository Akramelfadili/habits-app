import { render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { ColumnBars } from "./column-bars";

describe("ColumnBars", () => {
	it("draws one column per value, scaled to the 18px sparkline", async () => {
		await render(<ColumnBars values={[1, 0.5, 0]} />);
		const bars = screen.getAllByTestId("column-bar");
		expect(bars).toHaveLength(3);
		expect(bars[0]).toHaveStyle({ height: 18 });
		expect(bars[1]).toHaveStyle({ height: 9 });
		// Even a zero week keeps a visible stub.
		expect(bars[2]).toHaveStyle({ height: 2 });
	});

	it("draws a week with nothing scheduled as an empty slot, not a zero", async () => {
		await render(<ColumnBars values={[null]} />);
		expect(screen.getByTestId("column-bar")).toHaveStyle({
			height: 2,
			backgroundColor: surfaceColors.light.track,
		});
	});

	it("turns amber when slipping", async () => {
		await render(<ColumnBars values={[0.5]} tone="slipping" />);
		expect(screen.getByTestId("column-bar")).toHaveStyle({
			backgroundColor: semanticColors.light.warnInk,
		});
	});

	describe("chart context (HAB-17)", () => {
		it("fills 96px, one column per month, with a visible stub for a zero month", async () => {
			await render(<ColumnBars context="chart" values={[1, 0.5, 0]} />);
			expect(screen.getByTestId("column-chart")).toBeTruthy();
			const bars = screen.getAllByTestId("chart-bar-complete");
			expect(bars).toHaveLength(3);
			expect(bars[0]).toHaveStyle({ height: 96 });
			expect(bars[1]).toHaveStyle({ height: 48 });
			expect(bars[2]).toHaveStyle({ height: 4 });
		});

		it("draws before-start and future months as dashed slots, never hiding them", async () => {
			await render(
				<ColumnBars
					context="chart"
					values={[null, 0.8, 0.6, null]}
					states={["empty", "complete", "current", "empty"]}
				/>,
			);
			expect(screen.getAllByTestId("chart-bar-empty")).toHaveLength(2);
			expect(screen.getAllByTestId("chart-bar-empty")[0]).toHaveStyle({
				borderStyle: "dashed",
			});
			expect(screen.getAllByTestId("chart-bar-complete")).toHaveLength(1);
		});

		it("draws the month in progress lighter than the finished ones", async () => {
			await render(
				<ColumnBars
					context="chart"
					values={[0.8, 0.6]}
					states={["complete", "current"]}
				/>,
			);
			const done = screen.getByTestId("chart-bar-complete");
			const current = screen.getByTestId("chart-bar-current");
			expect(done).toHaveStyle({ backgroundColor: surfaceColors.light.ink });
			expect(current).not.toHaveStyle({
				backgroundColor: surfaceColors.light.ink,
			});
		});

		it("labels the axis, with the current month emphasised", async () => {
			await render(
				<ColumnBars
					context="chart"
					values={[0.8, 0.6]}
					states={["complete", "current"]}
					labels={["A", "S"]}
				/>,
			);
			expect(screen.getByText("A")).toHaveStyle({ fontWeight: undefined });
			expect(screen.getByText("S")).toHaveStyle({ fontWeight: "600" });
		});
	});
});
