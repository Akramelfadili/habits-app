import { fireEvent, render, screen } from "@testing-library/react-native";
import { CategoriesRow } from "./categories-row";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("CategoriesRow", () => {
	it("shows the count and opens Categories", async () => {
		const onPress = jest.fn();
		await render(<CategoriesRow count={12} onPress={onPress} />);
		expect(screen.getByText("Categories")).toBeTruthy();
		expect(screen.getByText("12")).toBeTruthy();
		await fireEvent.press(
			screen.getByRole("button", { name: "Categories, 12" }),
		);
		expect(onPress).toHaveBeenCalledTimes(1);
	});
});
