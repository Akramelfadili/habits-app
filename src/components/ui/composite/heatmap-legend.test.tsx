import { render, screen } from "@testing-library/react-native";
import { HeatmapLegend } from "./heatmap-legend";

describe("HeatmapLegend", () => {
	it("shows the Less→More ramp plus a distinct Frozen key", async () => {
		await render(<HeatmapLegend accent={230} />);
		expect(screen.getByText("Less")).toBeTruthy();
		expect(screen.getByText("More")).toBeTruthy();
		expect(screen.getByText("Frozen")).toBeTruthy();
		expect(screen.getAllByTestId("heatmap-cell-level")).toHaveLength(3);
		expect(screen.getByTestId("heatmap-cell-frozen")).toBeTruthy();
	});

	it("carries a live count on the frozen key when given one (VAR-09)", async () => {
		await render(<HeatmapLegend accent={230} frozenLabel="0 freezes left" />);
		expect(screen.getByText("0 freezes left")).toBeTruthy();
		expect(screen.queryByText("Frozen")).toBeNull();
	});
});
