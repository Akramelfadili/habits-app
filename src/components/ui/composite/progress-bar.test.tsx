import { fireEvent, render, screen } from "@testing-library/react-native";
import { Animated } from "react-native";
import { ProgressBar } from "./progress-bar";

describe("ProgressBar", () => {
	it("reports its value via accessibility, rounded to a percentage", async () => {
		await render(<ProgressBar value={0.29} />);
		expect(screen.getByTestId("progress-bar").props.accessibilityValue).toEqual(
			{
				min: 0,
				max: 100,
				now: 29,
			},
		);
	});

	it("clamps values above 1", async () => {
		await render(<ProgressBar value={1.5} />);
		expect(
			screen.getByTestId("progress-bar").props.accessibilityValue.now,
		).toBe(100);
	});

	it("clamps values below 0", async () => {
		await render(<ProgressBar value={-0.5} />);
		expect(
			screen.getByTestId("progress-bar").props.accessibilityValue.now,
		).toBe(0);
	});
});

describe("ProgressBar with a label", () => {
	it("shows the count left and a whole-number percentage right", async () => {
		await render(<ProgressBar value={0.2} label="1 of 5 done" />);
		expect(screen.getByText("1 of 5 done")).toBeTruthy();
		expect(screen.getByText("20%")).toBeTruthy();
	});

	it("reads count and percentage as one VoiceOver stop", async () => {
		await render(<ProgressBar value={0.2} label="1 of 5 done" />);
		expect(screen.getByLabelText("1 of 5 done, 20 percent")).toBeTruthy();
	});

	it("rounds the percentage to a whole number", async () => {
		await render(<ProgressBar value={1 / 3} label="2 of 6 done" />);
		expect(screen.getByText("33%")).toBeTruthy();
	});
});

let mockReduceMotion = false;
jest.mock("@/utils/use-reduced-motion", () => ({
	useReducedMotion: () => mockReduceMotion,
}));

describe("ProgressBar — indeterminate (SY3)", () => {
	beforeEach(() => {
		mockReduceMotion = false;
	});

	it("is a busy progress bar with no value and no percentage", async () => {
		await render(<ProgressBar value={0.64} indeterminate label="Updating" />);
		const bar = screen.getByTestId("progress-bar");
		expect(bar.props.accessibilityRole).toBe("progressbar");
		expect(bar.props.accessibilityState).toEqual({ busy: true });
		expect(bar.props.accessibilityValue).toBeUndefined();
		expect(screen.queryByText(/%/)).toBeNull();
	});

	it("reads its label as one stop, without a percentage", async () => {
		await render(<ProgressBar value={0} indeterminate label="Updating" />);
		expect(screen.getByLabelText("Updating")).toBeTruthy();
	});

	it("sweeps once the track is measured", async () => {
		const timing = jest.spyOn(Animated, "timing");
		await render(<ProgressBar value={0} indeterminate />);
		expect(timing).not.toHaveBeenCalled();
		await fireEvent(screen.getByTestId("progress-bar"), "layout", {
			nativeEvent: { layout: { width: 300, height: 6, x: 0, y: 0 } },
		});
		expect(timing).toHaveBeenCalledTimes(1);
		timing.mockRestore();
	});

	it("sits still with Reduce Motion", async () => {
		mockReduceMotion = true;
		const timing = jest.spyOn(Animated, "timing");
		await render(<ProgressBar value={0} indeterminate />);
		await fireEvent(screen.getByTestId("progress-bar"), "layout", {
			nativeEvent: { layout: { width: 300, height: 6, x: 0, y: 0 } },
		});
		expect(timing).not.toHaveBeenCalled();
		timing.mockRestore();
	});
});
