import { render, screen } from "@testing-library/react-native";
import { HeatmapLegend } from "./heatmap-legend";

describe("HeatmapLegend", () => {
	it("shows the Less→More ramp plus a distinct Frozen key", async () => {
		await render(<HeatmapLegend accent="blue" />);
		expect(screen.getByText("Less")).toBeTruthy();
		expect(screen.getByText("More")).toBeTruthy();
		expect(screen.getByText("Frozen")).toBeTruthy();
		expect(screen.getAllByTestId("heatmap-cell-level")).toHaveLength(3);
		expect(screen.getByTestId("heatmap-cell-frozen")).toBeTruthy();
	});
});
