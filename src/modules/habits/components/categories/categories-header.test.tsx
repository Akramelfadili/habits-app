import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
let mockLargeText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockLargeText,
}));

import { CategoriesHeader } from "./categories-header";

function setup(
	overrides: Partial<Parameters<typeof CategoriesHeader>[0]> = {},
) {
	const handlers = {
		onReorder: jest.fn(),
		onDone: jest.fn(),
		onAdd: jest.fn(),
	};
	return {
		...handlers,
		view: render(
			<CategoriesHeader
				eyebrow="10 built-in · 2 custom"
				accessibilityLabel="Categories, 10 built-in, 2 custom"
				mode="browse"
				{...handlers}
				{...overrides}
			/>,
		),
	};
}

beforeEach(() => {
	mockLargeText = false;
});

describe("CategoriesHeader", () => {
	it("reads the eyebrow and title as one heading", async () => {
		const { view } = setup();
		await view;
		expect(
			screen.getByRole("header", { name: "Categories, 10 built-in, 2 custom" }),
		).toBeTruthy();
		expect(screen.getByText("10 BUILT-IN · 2 CUSTOM")).toBeTruthy();
		expect(screen.getByText("Categories")).toBeTruthy();
	});

	it("browsing: Reorder and + do their jobs", async () => {
		const { onReorder, onAdd, view } = setup();
		await view;
		await fireEvent.press(screen.getByRole("button", { name: "Reorder" }));
		await fireEvent.press(screen.getByRole("button", { name: "Add category" }));
		expect(onReorder).toHaveBeenCalledTimes(1);
		expect(onAdd).toHaveBeenCalledTimes(1);
	});

	it("hides Reorder only while a row is being renamed (C3)", async () => {
		const { view } = setup({ renaming: true });
		await view;
		expect(screen.queryByRole("button", { name: "Reorder" })).toBeNull();
		expect(screen.getByRole("button", { name: "Add category" })).toBeTruthy();
	});

	it("reordering: Done replaces both buttons", async () => {
		const { onDone, view } = setup({ mode: "reorder" });
		await view;
		expect(screen.queryByRole("button", { name: "Add category" })).toBeNull();
		await fireEvent.press(screen.getByRole("button", { name: "Done" }));
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("at accessibility sizes the buttons sit above the title", async () => {
		mockLargeText = true;
		const { view } = setup();
		await view;
		const rendered = JSON.stringify(screen.toJSON());
		expect(rendered.indexOf("Reorder")).toBeLessThan(
			rendered.indexOf("10 BUILT-IN"),
		);
	});
});
