import { render, screen } from "@testing-library/react-native";
import { habitAccentInk } from "@/theme/theme";
import { builtInCategory, makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: (props: object) => <View testID="symbol" {...props} /> };
});

import { HabitBadge } from "./habit-badge";

describe("HabitBadge", () => {
	it("draws the 28px badge in the category's own icon and colour", async () => {
		const category = builtInCategory("Fitness");
		await render(<HabitBadge habit={makeHabit({ category })} />);
		expect(screen.toJSON()).toHaveStyle({ width: 28, height: 28 });
		expect(screen.getByTestId("symbol").props.tintColor).toBe(
			habitAccentInk(category.hue, "light"),
		);
	});
});
