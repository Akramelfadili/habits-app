import { fireEvent, render, screen } from "@testing-library/react-native";
import {
	makeCategory,
	TEST_BUILT_IN_CATEGORIES,
} from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { CategoryPicker } from "./category-picker";

const customs = [
	makeCategory({ id: 11, name: "Music" }),
	makeCategory({ id: 12, name: "A very long custom!!" }),
];
const categories = [...TEST_BUILT_IN_CATEGORIES, ...customs];

async function renderPicker(selectedId: number | null = null) {
	const onSelect = jest.fn();
	const onAdd = jest.fn();
	await render(
		<CategoryPicker
			categories={categories}
			selectedId={selectedId}
			onSelect={onSelect}
			onAdd={onAdd}
		/>,
	);
	return { onSelect, onAdd };
}

const chipLabels = () =>
	screen
		.getAllByTestId("category-chip")
		.map((chip) => chip.props.accessibilityLabel);

describe("CategoryPicker", () => {
	it("renders built-ins, then customs in the given order, then Add category last", async () => {
		await renderPicker();
		expect(chipLabels()).toEqual([
			...TEST_BUILT_IN_CATEGORIES.map((c) => c.name),
			"Music",
			"A very long custom!!",
			"Add category",
		]);
	});

	it("lays chips out two per row, with Add sharing the last row when it fits", async () => {
		await renderPicker();
		// 12 categories + Add = 13 cells → 7 rows; the last row is Add + a spacer.
		const rows = screen.getAllByTestId("category-picker-row");
		expect(rows).toHaveLength(7);
		for (const row of rows) expect(row.children).toHaveLength(2);
	});

	it("hints at what a category does until one is selected", async () => {
		await renderPicker();
		expect(screen.getByText("Sets the habit's icon & colour")).toBeTruthy();
	});

	it("shows the selected category in the header and marks only its chip", async () => {
		await renderPicker(11);
		expect(screen.queryByText("Sets the habit's icon & colour")).toBeNull();
		// Once on the chip, once in the header.
		expect(screen.getAllByText("Music")).toHaveLength(2);
		const selected = screen
			.getAllByTestId("category-chip")
			.filter((chip) => chip.props.accessibilityState?.selected)
			.map((chip) => chip.props.accessibilityLabel);
		expect(selected).toEqual(["Music"]);
	});

	it("selects another category on tap", async () => {
		const { onSelect } = await renderPicker(11);
		await fireEvent.press(screen.getByLabelText("Fitness"));
		expect(onSelect).toHaveBeenCalledWith(TEST_BUILT_IN_CATEGORIES[1].id);
	});

	it("ignores a tap on the already-selected chip", async () => {
		const { onSelect } = await renderPicker(11);
		await fireEvent.press(screen.getByLabelText("Music"));
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("opens the add flow from the Add chip", async () => {
		const { onAdd } = await renderPicker();
		await fireEvent.press(screen.getByLabelText("Add category"));
		expect(onAdd).toHaveBeenCalled();
	});

	it("truncates a long name on one line rather than wrapping the grid", async () => {
		await renderPicker();
		const label = screen.getByText("A very long custom!!");
		expect(label.props.numberOfLines).toBe(1);
		expect(label.props.ellipsizeMode).toBe("tail");
	});
});
