import { render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Animated, StyleSheet } from "react-native";
import { surfaceColors } from "@/theme/theme";
import { Skeleton } from "./skeleton";

let mockReduceMotion = false;
jest.mock("@/utils/use-reduced-motion", () => ({
	useReducedMotion: () => mockReduceMotion,
}));

beforeEach(() => {
	mockReduceMotion = false;
	jest
		.spyOn(AccessibilityInfo, "isReduceMotionEnabled")
		.mockResolvedValue(false);
});

describe("Skeleton", () => {
	it("is a shape on the inset surface with the size it is given", async () => {
		await render(<Skeleton width={120} height={12} />);
		const style = StyleSheet.flatten(
			screen.getByTestId("skeleton").props.style,
		);
		expect(style).toMatchObject({
			width: 120,
			height: 12,
			backgroundColor: surfaceColors.light.inner,
		});
	});

	it("a circle is as wide as it is high and fully round", async () => {
		await render(<Skeleton height={28} circle />);
		const style = StyleSheet.flatten(
			screen.getByTestId("skeleton").props.style,
		);
		expect(style).toMatchObject({ width: 28, height: 28, borderRadius: 14 });
	});

	it("takes an explicit radius, or the icon-square radius for its height", async () => {
		await render(<Skeleton height={32} radius={6} />);
		expect(
			StyleSheet.flatten(screen.getByTestId("skeleton").props.style)
				.borderRadius,
		).toBe(6);
	});

	it("pulses by default: a looping fade over the 1.2 s token", async () => {
		const timing = jest.spyOn(Animated, "timing");
		await render(<Skeleton height={12} />);
		expect(timing).toHaveBeenCalled();
		const durations = timing.mock.calls.map(([, config]) => config.duration);
		expect(durations.reduce<number>((sum, d) => sum + (d ?? 0), 0)).toBe(1200);
		timing.mockRestore();
	});

	it("sits still with Reduce Motion: nothing is animated", async () => {
		mockReduceMotion = true;
		const timing = jest.spyOn(Animated, "timing");
		await render(<Skeleton height={12} />);
		expect(timing).not.toHaveBeenCalled();
		timing.mockRestore();
	});
});
