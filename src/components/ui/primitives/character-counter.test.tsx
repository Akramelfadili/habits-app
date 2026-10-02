import { render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { CharacterCounter, counterThreshold } from "./character-counter";

describe("CharacterCounter", () => {
	it.each([
		[20, 16],
		[32, 26],
	])("for a %i limit, starts showing at %i (80%%)", (limit, threshold) => {
		expect(counterThreshold(limit)).toBe(threshold);
	});

	it.each([
		[20, 15, false],
		[20, 16, true],
		[32, 25, false],
		[32, 26, true],
	])("limit %i, length %i → shown: %s", async (limit, length, shown) => {
		await render(<CharacterCounter length={length} limit={limit} />);
		expect(screen.queryByText(`${length}/${limit}`) !== null).toBe(shown);
	});

	it.each([
		[20, 19],
		[32, 31],
	])("stays neutral just under the %i limit", async (limit, length) => {
		await render(<CharacterCounter length={length} limit={limit} />);
		expect(screen.getByText(`${length}/${limit}`)).toHaveStyle({
			color: surfaceColors.light.faint,
		});
	});

	it.each([20, 32])("turns amber at the %i limit", async (limit) => {
		await render(<CharacterCounter length={limit} limit={limit} />);
		expect(screen.getByText(`${limit}/${limit}`)).toHaveStyle({
			color: semanticColors.light.warnInk,
		});
	});
});
