import { render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { FieldHelper } from "./field-helper";

describe("FieldHelper", () => {
	it("shows a neutral blocking reason by default", async () => {
		await render(<FieldHelper>Pick a category to save this habit</FieldHelper>);
		expect(screen.getByText("Pick a category to save this habit")).toHaveStyle({
			color: surfaceColors.light.faint,
		});
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("shows an error in amber and announces it", async () => {
		await render(
			<FieldHelper tone="error">You already have Fitness.</FieldHelper>,
		);
		expect(screen.getByText("You already have Fitness.")).toHaveStyle({
			color: semanticColors.light.warnInk,
		});
		expect(screen.getByRole("alert")).toBeTruthy();
	});
});
