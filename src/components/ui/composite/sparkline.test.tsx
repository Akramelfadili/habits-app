import { render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { Sparkline } from "./sparkline";

const light = { ...surfaceColors.light, ...semanticColors.light };

describe("Sparkline", () => {
	it("draws 6 pt wide columns up to 24 pt tall, scaled to 1", async () => {
		await render(
			<Sparkline values={[1, 0.5, 0.25]} accessibilityLabel="Drink water" />,
		);
		const bars = screen.getAllByTestId("sparkline-bar", {
			includeHiddenElements: true,
		});
		expect(bars[0]).toHaveStyle({ width: 6, height: 24, borderRadius: 3 });
		expect(bars[1]).toHaveStyle({ height: 12 });
		expect(bars[2]).toHaveStyle({ height: 6 });
	});

	it("shows an all-zero series as 3 pt stubs on the track, not as nothing", async () => {
		await render(<Sparkline values={[0, 0]} accessibilityLabel="x" />);
		const [bar] = screen.getAllByTestId("sparkline-bar", {
			includeHiddenElements: true,
		});
		expect(bar).toHaveStyle({ height: 3, backgroundColor: light.track });
	});

	it("draws before-start as a dashed stub", async () => {
		await render(<Sparkline values={[null, 1]} accessibilityLabel="x" />);
		expect(
			screen.getByTestId("sparkline-before-start", {
				includeHiddenElements: true,
			}),
		).toHaveStyle({ borderStyle: "dashed", height: 3 });
	});

	it("turns the slipping columns amber and the running one lighter", async () => {
		await render(
			<Sparkline
				values={[1, 1, 0.5, 0.5]}
				slippingFrom={2}
				currentIndex={3}
				accessibilityLabel="x"
			/>,
		);
		const bars = screen.getAllByTestId("sparkline-bar", {
			includeHiddenElements: true,
		});
		expect(bars[1]).toHaveStyle({ backgroundColor: light.ink });
		expect(bars[2]).toHaveStyle({ backgroundColor: light.warnInk });
		expect(bars[3]).toHaveStyle({ backgroundColor: light.faint });
	});

	it("is one VoiceOver stop", async () => {
		await render(
			<Sparkline values={[1]} accessibilityLabel="Drink water, last 6 weeks" />,
		);
		expect(
			screen.getByLabelText("Drink water, last 6 weeks").props.accessible,
		).toBe(true);
	});
});
