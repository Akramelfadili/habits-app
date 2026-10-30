import { render, screen } from "@testing-library/react-native";
import { habitAccentInk, surfaceColors } from "@/theme/theme";
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

	it("the default size is the 32 pt row square (V3-32)", async () => {
		await render(<HabitBadge habit={makeHabit()} size="default" />);
		expect(screen.toJSON()).toHaveStyle({ width: 32, height: 32 });
	});

	it("muted drops the category colour for the neutral ink, so an archived habit reads as set aside", async () => {
		const category = builtInCategory("Fitness");
		await render(<HabitBadge habit={makeHabit({ category })} muted />);
		expect(screen.getByTestId("symbol").props.tintColor).not.toBe(
			habitAccentInk(category.hue, "light"),
		);
	});

	it("muted draws the track square with sub ink, visible on a white card (H2)", async () => {
		await render(<HabitBadge habit={makeHabit()} size="default" muted />);
		expect(screen.toJSON()).toHaveStyle({
			backgroundColor: surfaceColors.light.track,
		});
		expect(screen.getByTestId("symbol").props.tintColor).toBe(
			surfaceColors.light.sub,
		);
	});
});
