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
