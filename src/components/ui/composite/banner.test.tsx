import { fireEvent, render, screen } from "@testing-library/react-native";
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

	it("error tone sits on the inset surface with a filled danger marker", async () => {
		await render(<Banner tone="error">Couldn't save. Try again.</Banner>);
		expect(screen.getByTestId("banner")).toHaveStyle({
			backgroundColor: surfaceColors.light.inner,
		});
		expect(screen.getByTestId("banner-marker")).toHaveStyle({
			backgroundColor: semanticColors.light.dangerBg,
		});
		expect(screen.getByText("Couldn't save. Try again.")).toHaveStyle({
			color: surfaceColors.light.ink,
		});
	});

	it("shows an action link under the message and fires it (HAB-15)", async () => {
		const onPress = jest.fn();
		await render(
			<Banner tone="neutral" action={{ label: "Open iOS Settings →", onPress }}>
				Notifications are off.
			</Banner>,
		);
		await fireEvent.press(screen.getByText("Open iOS Settings →"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("has no link without an action", async () => {
		await render(<Banner>Plain.</Banner>);
		expect(screen.queryByRole("link")).toBeNull();
	});
});
