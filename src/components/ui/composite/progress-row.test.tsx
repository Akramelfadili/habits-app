import { render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { ProgressRow } from "./progress-row";

describe("ProgressRow", () => {
	it("renders the label, the count, and a bar at the given value", async () => {
		await render(<ProgressRow label="Read" count="5/7" value={5 / 7} />);
		expect(screen.getByText("Read")).toBeTruthy();
		expect(screen.getByText("5/7")).toBeTruthy();
		expect(screen.getByLabelText("Read: 5/7")).toBeTruthy();
		expect(screen.getByTestId("progress-bar")).toHaveProp(
			"accessibilityValue",
			{
				min: 0,
				max: 100,
				now: 71,
			},
		);
	});

	it("tints only the bar for the warning tone", async () => {
		await render(
			<ProgressRow label="Mobility" count="2/7" value={2 / 7} tone="warning" />,
		);
		expect(screen.getByText("Mobility")).toHaveStyle({
			color: surfaceColors.light.ink,
		});
		const fill = screen.getByTestId("progress-bar").children[0];
		expect(fill).toHaveStyle({ backgroundColor: semanticColors.light.warnInk });
	});
});
