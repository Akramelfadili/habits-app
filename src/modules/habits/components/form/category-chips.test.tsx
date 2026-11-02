import { fireEvent, render, screen } from "@testing-library/react-native";
import {
	categoryNamed,
	TEST_BUILT_IN_CATEGORIES,
} from "../../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { CategoryChips } from "./category-chips";

const categories = [...TEST_BUILT_IN_CATEGORIES, categoryNamed("Morning")];

describe("CategoryChips", () => {
	it("lists every category in the given order, then New category, with the optional note", async () => {
		await render(
			<CategoryChips
				categories={categories}
				selectedId={null}
				onSelect={jest.fn()}
				onAdd={jest.fn()}
			/>,
		);
		const names = screen
			.getAllByRole("button")
			.map((chip) => chip.props.accessibilityLabel);
		expect(names).toEqual([
			...categories.map((category) => category.name),
			"New category",
		]);
		expect(
			screen.getByText("Optional — habits without one go to Other."),
		).toBeTruthy();
	});

	it("marks only the picked chip selected, for VoiceOver too", async () => {
		await render(
			<CategoryChips
				categories={categories}
				selectedId={categories[4].id}
				onSelect={jest.fn()}
				onAdd={jest.fn()}
			/>,
		);
		const selected = screen
			.getAllByRole("button")
			.filter((chip) => chip.props.accessibilityState?.selected);
		expect(selected.map((chip) => chip.props.accessibilityLabel)).toEqual([
			categories[4].name,
		]);
	});

	it("picks a category, and clears it when the picked one is tapped again", async () => {
		const onSelect = jest.fn();
		const { rerender } = await render(
			<CategoryChips
				categories={categories}
				selectedId={null}
				onSelect={onSelect}
				onAdd={jest.fn()}
			/>,
		);
		await fireEvent.press(screen.getByLabelText("Health"));
		expect(onSelect).toHaveBeenLastCalledWith(categories[0].id);

		await rerender(
			<CategoryChips
				categories={categories}
				selectedId={categories[0].id}
				onSelect={onSelect}
				onAdd={jest.fn()}
			/>,
		);
		await fireEvent.press(screen.getByLabelText("Health"));
		expect(onSelect).toHaveBeenLastCalledWith(null);
	});

	it("opens the add flow from New category", async () => {
		const onAdd = jest.fn();
		await render(
			<CategoryChips
				categories={categories}
				selectedId={null}
				onSelect={jest.fn()}
				onAdd={onAdd}
			/>,
		);
		await fireEvent.press(screen.getByLabelText("New category"));
		expect(onAdd).toHaveBeenCalledTimes(1);
	});
});
