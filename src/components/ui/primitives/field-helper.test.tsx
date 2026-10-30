import { render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { FieldHelper } from "./field-helper";

describe("FieldHelper", () => {
	it("shows a neutral blocking reason in sub ink by default", async () => {
		await render(<FieldHelper>Pick a category to save this habit</FieldHelper>);
		expect(screen.getByText("Pick a category to save this habit")).toHaveStyle({
			color: surfaceColors.light.sub,
		});
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("shows a hint the same neutral way", async () => {
		await render(<FieldHelper tone="hint">Shown after the number</FieldHelper>);
		expect(screen.getByText("Shown after the number")).toHaveStyle({
			color: surfaceColors.light.sub,
		});
	});

	it("shows an error in danger ink with a '!' and announces it", async () => {
		await render(
			<FieldHelper tone="error">You already have Fitness.</FieldHelper>,
		);
		expect(screen.getByText("You already have Fitness.")).toHaveStyle({
			color: semanticColors.light.dangerBg,
		});
		expect(screen.getByText("!")).toBeTruthy();
		expect(screen.getByRole("alert")).toBeTruthy();
	});

	it("shows the limit notice in amber, not as an alert", async () => {
		await render(<FieldHelper tone="limit">32 characters max</FieldHelper>);
		expect(screen.getByText("32 characters max")).toHaveStyle({
			color: semanticColors.light.warnInk,
		});
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("drops the dot for a plain note but keeps the '!' on an error", async () => {
		const { toJSON, rerender } = await render(
			<FieldHelper plain>Optional — goes to Other.</FieldHelper>,
		);
		const withDot = JSON.stringify(toJSON()).includes("borderRadius");
		expect(withDot).toBe(false);
		await rerender(
			<FieldHelper plain tone="error">
				Pick at least one day
			</FieldHelper>,
		);
		expect(screen.getByText("!")).toBeTruthy();
	});
});
