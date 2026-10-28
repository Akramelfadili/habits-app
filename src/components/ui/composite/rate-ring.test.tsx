import { render, screen } from "@testing-library/react-native";
import { RateRing } from "./rate-ring";

describe("RateRing", () => {
	it("shows the rate as a whole number with its label under it", async () => {
		await render(
			<RateRing
				percent={84}
				label="this month"
				accessibilityLabel="84 percent this month"
			/>,
		);
		expect(
			screen.getByText("84%", { includeHiddenElements: true }),
		).toBeTruthy();
		expect(
			screen.getByText("this month", { includeHiddenElements: true }),
		).toBeTruthy();
	});

	it("is one progressbar stop with the value", async () => {
		await render(
			<RateRing
				percent={27}
				label="this month"
				accessibilityLabel="27 percent this month"
			/>,
		);
		const ring = screen.getByLabelText("27 percent this month");
		expect(ring.props.accessibilityRole).toBe("progressbar");
		expect(ring.props.accessibilityValue).toEqual({
			min: 0,
			max: 100,
			now: 27,
		});
	});

	it.each([
		[0, -135, -135],
		[100, 45, 45],
	])(
		"turns the halves for %i %% to %i° and %i°",
		async (percent, right, left) => {
			await render(
				<RateRing
					percent={percent}
					label="x"
					accessibilityLabel={`p${percent}`}
				/>,
			);
			const rotate = (testID: string) =>
				Number(
					JSON.stringify(
						screen.getByTestId(testID, { includeHiddenElements: true }).props
							.style,
					).match(/"rotate":"(-?[\d.]+)deg"/)?.[1],
				);
			expect(rotate("rate-ring-right")).toBe(right);
			expect(rotate("rate-ring-left")).toBe(left);
		},
	);

	it("draws too early as a dashed ring with a dash", async () => {
		await render(
			<RateRing
				percent={null}
				label="day 3 of 7"
				accessibilityLabel="Too early"
			/>,
		);
		expect(
			screen.getByTestId("rate-ring-too-early", {
				includeHiddenElements: true,
			}),
		).toHaveStyle({
			borderStyle: "dashed",
		});
		expect(screen.getByText("—", { includeHiddenElements: true })).toBeTruthy();
		expect(
			screen.getByText("day 3 of 7", { includeHiddenElements: true }),
		).toBeTruthy();
	});
});
