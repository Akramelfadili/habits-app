import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native";
import { mockMeasureInWindow } from "../test-support/measure-in-window";

jest.mock("expo-symbols", () => {
	const { View: MockView } = require("react-native");
	return { SymbolView: MockView };
});

import { TodayHeader } from "./today-header";

const TODAY = new Date(2026, 9, 1, 9);

async function renderHeader(
	props: Partial<React.ComponentProps<typeof TodayHeader>> = {},
) {
	const calls: string[] = [];
	const onToggleMenu = jest.fn(() => calls.push("toggle"));
	const onAddHabit = jest.fn();
	const onAnchorMeasured = jest.fn((bottom: number) =>
		calls.push(`anchor:${bottom}`),
	);
	const view = await render(
		<TodayHeader
			today={TODAY}
			menuOpen={false}
			onToggleMenu={onToggleMenu}
			onAddHabit={onAddHabit}
			onAnchorMeasured={onAnchorMeasured}
			{...props}
		/>,
	);
	return { view, calls, onToggleMenu, onAddHabit, onAnchorMeasured };
}

describe("TodayHeader", () => {
	it("shows the date eyebrow and the Today title", async () => {
		await renderHeader();
		expect(screen.getByText("Today")).toBeTruthy();
		expect(screen.getByText("THURSDAY, 1 OCTOBER")).toBeTruthy();
	});

	it("has an Add habit + beside the menu button, and the Today title is a heading", async () => {
		const { onAddHabit } = await renderHeader();
		await fireEvent.press(screen.getByRole("button", { name: "Add habit" }));
		expect(onAddHabit).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("header", { name: "Today" })).toBeTruthy();
	});

	it("measures the button before opening, so the menu gets its final anchor first", async () => {
		const spy = mockMeasureInWindow({ x: 300, y: 56, width: 44, height: 44 });
		const { calls } = await renderHeader();

		await fireEvent.press(screen.getByLabelText("More"));

		expect(calls).toEqual(["anchor:100", "toggle"]);
		spy.mockRestore();
	});

	it("ignores a second press while the first is still being measured", async () => {
		let finish: (() => void) | undefined;
		const spy = jest
			.spyOn(View.prototype, "measureInWindow")
			.mockImplementation((callback) => {
				finish = () => callback(0, 56, 44, 44);
			});
		const { onToggleMenu } = await renderHeader();

		await fireEvent.press(screen.getByLabelText("More"));
		await fireEvent.press(screen.getByLabelText("More"));
		finish?.();

		expect(onToggleMenu).toHaveBeenCalledTimes(1);
		spy.mockRestore();
	});

	it("closes immediately, without measuring, when the menu is open", async () => {
		const spy = mockMeasureInWindow();
		const { onToggleMenu, onAnchorMeasured } = await renderHeader({
			menuOpen: true,
		});

		await fireEvent.press(screen.getByLabelText("More"));

		expect(onToggleMenu).toHaveBeenCalledTimes(1);
		expect(onAnchorMeasured).not.toHaveBeenCalled();
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});
});
