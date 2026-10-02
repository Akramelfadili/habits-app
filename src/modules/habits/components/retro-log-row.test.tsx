import { fireEvent, render, screen } from "@testing-library/react-native";
import { categoryNamed, makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("../repositories/frozen-day-repository", () => ({}));

import { RetroLogRow } from "./retro-log-row";

const water = makeHabit({
	name: "Glass of water",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});
const walk = makeHabit({ name: "Walk", category: categoryNamed("Evening") });

async function renderRow(
	props: Partial<React.ComponentProps<typeof RetroLogRow>> = {},
) {
	const onChange = jest.fn();
	const onToggleExpanded = jest.fn();
	const view = await render(
		<RetroLogRow
			habit={walk}
			value={false}
			onChange={onChange}
			expanded={false}
			onToggleExpanded={onToggleExpanded}
			{...props}
		/>,
	);
	return { ...view, onChange, onToggleExpanded };
}

describe("RetroLogRow", () => {
	it("shows a check habit's name and category, checked when done", async () => {
		await renderRow({ value: true });
		expect(screen.getByText("Walk")).toBeTruthy();
		expect(screen.getByText("Evening")).toBeTruthy();
		expect(screen.getByRole("checkbox", { name: "Walk, done" })).toBeChecked();
	});

	it("dims a not-done row", async () => {
		await renderRow({ value: false });
		expect(screen.getByTestId("list-item-content")).toHaveStyle({
			opacity: 0.5,
		});
	});

	it("flips a check habit from the check or the row", async () => {
		const { onChange } = await renderRow({ value: false });
		await fireEvent.press(screen.getByRole("checkbox"));
		await fireEvent.press(
			screen.getByRole("button", { name: "Walk, not done" }),
		);
		expect(onChange.mock.calls).toEqual([[true], [true]]);
	});

	it("uses resisted framing for a Break habit", async () => {
		await renderRow({
			habit: makeHabit({ name: "No phone", direction: "break" }),
			value: true,
		});
		expect(screen.getByText("Resisted")).toBeTruthy();
		expect(
			screen.getByRole("checkbox", { name: "No phone, resisted" }),
		).toBeTruthy();
	});

	it("checks a quantity habit up to its full target, and clears it back to nothing", async () => {
		const partial = await renderRow({ habit: water, value: 6 });
		expect(screen.getByText("6 of 8 glasses")).toBeTruthy();
		expect(screen.getByRole("checkbox")).not.toBeChecked();
		await fireEvent.press(screen.getByRole("checkbox"));
		expect(partial.onChange).toHaveBeenCalledWith(8);
		await partial.unmount();

		const full = await renderRow({ habit: water, value: 8 });
		expect(screen.getByText("8 glasses")).toBeTruthy();
		await fireEvent.press(screen.getByRole("checkbox"));
		expect(full.onChange).toHaveBeenCalledWith(0);
	});

	it("tapping a quantity row asks to expand its stepper, which sets an exact amount", async () => {
		const collapsed = await renderRow({ habit: water, value: 6 });
		await fireEvent.press(
			screen.getByRole("button", {
				name: "Glass of water, set an exact amount",
			}),
		);
		expect(collapsed.onToggleExpanded).toHaveBeenCalledTimes(1);
		expect(collapsed.onChange).not.toHaveBeenCalled();
		await collapsed.unmount();

		const expanded = await renderRow({
			habit: water,
			value: 6,
			expanded: true,
		});
		await fireEvent.press(screen.getByRole("button", { name: /increase/i }));
		expect(expanded.onChange).toHaveBeenCalledWith(7);
	});
});
