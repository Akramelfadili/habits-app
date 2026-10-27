import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View: MockView } = require("react-native");
	return { SymbolView: MockView };
});

import { HabitsHeader } from "./habits-header";

async function renderHeader() {
	const onOpenSettings = jest.fn();
	const onAddHabit = jest.fn();
	await render(
		<HabitsHeader onOpenSettings={onOpenSettings} onAddHabit={onAddHabit} />,
	);
	return { onOpenSettings, onAddHabit };
}

describe("HabitsHeader", () => {
	it("titles the tab and offers exactly the gear and the +", async () => {
		await renderHeader();
		expect(screen.getByRole("header", { name: "Habits" })).toBeTruthy();
		expect(screen.getAllByRole("button")).toHaveLength(2);
	});

	// The gear is the only way into Settings now (D3).
	it("opens Settings from the gear", async () => {
		const { onOpenSettings, onAddHabit } = await renderHeader();
		await fireEvent.press(screen.getByRole("button", { name: "Settings" }));
		expect(onOpenSettings).toHaveBeenCalledTimes(1);
		expect(onAddHabit).not.toHaveBeenCalled();
	});

	it("opens Add habit from the +", async () => {
		const { onOpenSettings, onAddHabit } = await renderHeader();
		await fireEvent.press(screen.getByRole("button", { name: "Add habit" }));
		expect(onAddHabit).toHaveBeenCalledTimes(1);
		expect(onOpenSettings).not.toHaveBeenCalled();
	});
});
