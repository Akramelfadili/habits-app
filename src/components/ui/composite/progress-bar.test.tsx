import { render, screen } from "@testing-library/react-native";
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

describe("ProgressBar with a label (V3-07)", () => {
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
