import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View: MockView } = require("react-native");
	return { SymbolView: MockView };
});

import { TodayHeader } from "./today-header";

const DAY = new Date(2026, 9, 23, 9);

async function renderHeader() {
	const onAddHabit = jest.fn();
	const view = await render(<TodayHeader day={DAY} onAddHabit={onAddHabit} />);
	return { view, onAddHabit };
}

describe("TodayHeader (V3-02)", () => {
	it("shows the date eyebrow and the Today title", async () => {
		await renderHeader();
		expect(screen.getByText("Today")).toBeTruthy();
		expect(screen.getByText("FRIDAY, 23 OCTOBER")).toBeTruthy();
	});

	it("is one heading stop: 'Today, Friday 23 October'", async () => {
		await renderHeader();
		expect(
			screen.getByRole("header", { name: "Today, Friday 23 October" }),
		).toBeTruthy();
	});

	it("has an Add habit +, drawn so it shows on web too", async () => {
		const { onAddHabit } = await renderHeader();
		await fireEvent.press(screen.getByRole("button", { name: "Add habit" }));
		expect(onAddHabit).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId("header-circle-plus-glyph")).toBeTruthy();
	});

	it("names a past day in the eyebrow", async () => {
		await render(
			<TodayHeader day={new Date(2026, 9, 21)} onAddHabit={jest.fn()} />,
		);
		expect(screen.getByText("WEDNESDAY, 21 OCTOBER")).toBeTruthy();
	});

	it("has no ⋯ menu button", async () => {
		await renderHeader();
		expect(screen.getAllByRole("button")).toHaveLength(1);
	});
});
