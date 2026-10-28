import { fireEvent, render, screen } from "@testing-library/react-native";
import { noSocial, read, water } from "../../test-support/progress-views";
import { HabitFilterSheet } from "./habit-filter-sheet";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const archived = {
	...read,
	id: 9,
	name: "Morning run",
	archivedAt: new Date(2026, 9, 12),
};

function setup(selectedId: number | null = null, list = [archived]) {
	const onSelect = jest.fn();
	const onDismiss = jest.fn();
	const view = render(
		<HabitFilterSheet
			visible
			active={[water, noSocial]}
			archived={list}
			selectedId={selectedId}
			onSelect={onSelect}
			onDismiss={onDismiss}
		/>,
	);
	return { view, onSelect, onDismiss };
}

describe("HabitFilterSheet (HP1, HP2)", () => {
	it("lists All habits first, then the active habits, then the archived ones", async () => {
		await setup().view;
		expect(screen.getByText("Show habit")).toBeTruthy();
		expect(screen.getByText("All habits")).toBeTruthy();
		expect(screen.getByText("2 active")).toBeTruthy();
		expect(screen.getByText("Drink water")).toBeTruthy();
		expect(screen.getByText("ARCHIVED · 1")).toBeTruthy();
		expect(screen.getByText("Morning run")).toBeTruthy();
		expect(screen.getByText("Learning · archived 12 Oct")).toBeTruthy();
	});

	it("tags a Break habit in its subline", async () => {
		await setup().view;
		expect(screen.getByText("Productivity · Break")).toBeTruthy();
	});

	it("checks the current choice and announces it", async () => {
		await setup(water.id).view;
		expect(screen.getAllByTestId("filter-check")).toHaveLength(1);
		expect(screen.getByLabelText("Drink water, selected")).toBeTruthy();
	});

	it("checks All habits when nothing is filtered", async () => {
		await setup(null).view;
		expect(
			screen.getByLabelText("All habits, 2 active, selected"),
		).toBeTruthy();
	});

	it("picks one habit, or resets with All habits", async () => {
		const { view, onSelect } = setup();
		await view;
		await fireEvent.press(screen.getByText("Drink water"));
		expect(onSelect).toHaveBeenLastCalledWith(water.id);
		await fireEvent.press(screen.getByText("All habits"));
		expect(onSelect).toHaveBeenLastCalledWith(null);
		await fireEvent.press(screen.getByText("Morning run"));
		expect(onSelect).toHaveBeenLastCalledWith(9);
	});

	it("closes", async () => {
		const { view, onDismiss } = setup();
		await view;
		await fireEvent.press(screen.getByText("Close"));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("leaves the archived section out when there is none", async () => {
		await setup(null, []).view;
		expect(screen.queryByText(/^ARCHIVED/)).toBeNull();
	});
});
