import { render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { DeltaLabel } from "./delta-label";

describe("DeltaLabel", () => {
	it("signs a rise and reads it quietly", async () => {
		await render(<DeltaLabel points={4} />);
		expect(screen.getByText("+4")).toHaveStyle({
			color: surfaceColors.light.sub,
		});
		expect(screen.getByLabelText("up 4 points")).toBeTruthy();
	});

	it("draws a fall with a real minus in the warning ink", async () => {
		await render(<DeltaLabel points={-3} />);
		expect(screen.getByText("−3")).toHaveStyle({
			color: semanticColors.light.warnInk,
		});
		expect(screen.getByLabelText("down 3 points")).toBeTruthy();
	});

	it("shows no change as a plain zero", async () => {
		await render(<DeltaLabel points={0} />);
		expect(screen.getByText("0")).toBeTruthy();
		expect(screen.getByLabelText("no change")).toBeTruthy();
	});
});
