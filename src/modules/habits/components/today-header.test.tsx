import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View: MockView } = require("react-native");
	return { SymbolView: MockView };
});

import { TodayHeader } from "./today-header";

const TODAY = new Date(2026, 9, 1, 9);

async function renderHeader() {
	const onAddHabit = jest.fn();
	const view = await render(
		<TodayHeader today={TODAY} onAddHabit={onAddHabit} />,
	);
	return { view, onAddHabit };
}

describe("TodayHeader", () => {
	it("shows the date eyebrow and the Today title", async () => {
		await renderHeader();
		expect(screen.getByText("Today")).toBeTruthy();
		expect(screen.getByText("THURSDAY, 1 OCTOBER")).toBeTruthy();
	});

	it("has an Add habit +, and the Today title is a heading", async () => {
		const { onAddHabit } = await renderHeader();
		await fireEvent.press(screen.getByRole("button", { name: "Add habit" }));
		expect(onAddHabit).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("header", { name: "Today" })).toBeTruthy();
	});

	// The ⋯ menu is gone (HAB-27, D2): the header's only action is the +.
	it("has no ⋯ menu button", async () => {
		await renderHeader();
		expect(screen.queryByLabelText("More")).toBeNull();
		expect(screen.getAllByRole("button")).toHaveLength(1);
	});
});
