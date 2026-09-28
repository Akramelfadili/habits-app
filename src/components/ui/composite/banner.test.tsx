import { render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { Banner } from "./banner";

describe("Banner", () => {
	it("renders its message on the warning tint by default", async () => {
		await render(<Banner>Saturday is not a scheduled day.</Banner>);
		expect(screen.getByText("Saturday is not a scheduled day.")).toBeTruthy();
		expect(screen.getByTestId("banner")).toHaveStyle({
			backgroundColor: semanticColors.light.warnTint,
		});
		expect(screen.getByTestId("banner-marker")).toHaveStyle({
			backgroundColor: semanticColors.light.warnInk,
		});
	});

	it("neutral tone sits on the inset surface with a hollow ring", async () => {
		await render(<Banner tone="neutral">Notifications are off.</Banner>);
		expect(screen.getByTestId("banner")).toHaveStyle({
			backgroundColor: surfaceColors.light.inner,
		});
		expect(screen.getByTestId("banner-marker")).toHaveStyle({
			borderColor: surfaceColors.light.faint,
		});
	});
});
