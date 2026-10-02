import { fireEvent, render, screen } from "@testing-library/react-native";
import {
	heatmapLevelColor,
	inkLevelColor,
	semanticColors,
	surfaceColors,
} from "@/theme/theme";
import { HeatmapCell } from "./heatmap-cell";

describe("HeatmapCell", () => {
	it("fills a level with the accent's ramp step", async () => {
		await render(
			<HeatmapCell state={{ kind: "level", level: 2 }} accent={195} />,
		);
		expect(screen.getByTestId("heatmap-cell-level")).toHaveStyle({
			backgroundColor: heatmapLevelColor(195, 2, "light"),
		});
	});

	it("gives a frozen day its own dashed treatment, not a completion shade", async () => {
		await render(<HeatmapCell state={{ kind: "frozen" }} accent={195} />);
		expect(screen.getByTestId("heatmap-cell-frozen")).toHaveStyle({
			backgroundColor: semanticColors.light.frozenBg,
			borderStyle: "dashed",
		});
	});

	it("draws a bonus day (off-schedule log) as a blank cell with a centred dot", async () => {
		await render(
			<HeatmapCell state={{ kind: "bonus" }} accent={195} size={18} />,
		);
		expect(screen.getByTestId("heatmap-cell-bonus")).toHaveStyle({
			backgroundColor: surfaceColors.light.card,
		});
		expect(screen.getByTestId("heatmap-cell-bonus-dot")).toBeTruthy();
	});

	it("renders missed as the neutral track and not-scheduled as blank", async () => {
		await render(
			<>
				<HeatmapCell state={{ kind: "missed" }} accent={195} />
				<HeatmapCell state={{ kind: "not-scheduled" }} accent={195} />
			</>,
		);
		expect(screen.getByTestId("heatmap-cell-missed")).toHaveStyle({
			backgroundColor: surfaceColors.light.track,
		});
		expect(screen.getByTestId("heatmap-cell-not-scheduled")).toHaveStyle({
			backgroundColor: surfaceColors.light.card,
		});
	});

	it("is only a button when given onPress", async () => {
		const onPress = jest.fn();
		await render(
			<>
				<HeatmapCell
					state={{ kind: "missed" }}
					accent={195}
					onPress={onPress}
					accessibilityLabel="Monday 21 September"
				/>
				<HeatmapCell state={{ kind: "not-scheduled" }} accent={195} />
			</>,
		);
		expect(screen.getAllByRole("button")).toHaveLength(1);
		fireEvent.press(screen.getByLabelText("Monday 21 September"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("draws an outside day as a dashed outline with no fill (HAB-16)", async () => {
		await render(<HeatmapCell state={{ kind: "outside" }} accent={null} />);
		expect(screen.getByTestId("heatmap-cell-outside")).toHaveStyle({
			backgroundColor: "transparent",
			borderStyle: "dashed",
		});
	});

	it.each([
		[11, 3],
		[12, 4],
		[16, 5],
		[18, 6],
		[30, 10],
	])("rounds a %ipx cell by a third of its edge (%i)", async (size, radius) => {
		await render(
			<HeatmapCell state={{ kind: "missed" }} accent={null} size={size} />,
		);
		expect(screen.getByTestId("heatmap-cell-missed")).toHaveStyle({
			width: size,
			height: size,
			borderRadius: radius,
		});
	});

	it("shades levels on the ink ramp for a grid across habits (HAB-16)", async () => {
		await render(
			<HeatmapCell
				state={{ kind: "level", level: 3 }}
				accent={195}
				ramp="ink"
			/>,
		);
		expect(screen.getByTestId("heatmap-cell-level")).toHaveStyle({
			backgroundColor: inkLevelColor(3, "light"),
		});
	});
});
