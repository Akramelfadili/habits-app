import { fireEvent, render, screen } from "@testing-library/react-native";
import {
	heatmapLevelColor,
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
});
