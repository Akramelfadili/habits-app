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
});
