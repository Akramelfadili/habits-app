import { fireEvent, render, screen } from "@testing-library/react-native";
import { categoryNamed, makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

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
	const view = await render(
		<RetroLogRow habit={walk} value={false} onChange={onChange} {...props} />,
	);
	return { ...view, onChange };
}

describe("RetroLogRow", () => {
	it("shows a check habit's name and category, checked when done", async () => {
		await renderRow({ value: true });
		expect(screen.getByText("Walk")).toBeTruthy();
		expect(screen.getByText("Evening")).toBeTruthy();
		expect(screen.getByRole("checkbox", { name: "Walk, done" })).toBeChecked();
	});

	it("never dims a not-done row (HAB-18)", async () => {
		await renderRow({ value: false });
		expect(screen.getByTestId("list-item-content")).not.toHaveStyle({
			opacity: 0.5,
		});
	});

	it("says why the origin habit is pinned", async () => {
		await renderRow({ origin: true });
		expect(screen.getByText("The habit you opened this day from")).toBeTruthy();
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

	it("gives a quantity habit an inline stepper instead of a checkbox", async () => {
		const { onChange } = await renderRow({ habit: water, value: 6 });
		expect(screen.queryByRole("checkbox")).toBeNull();
		expect(screen.getByText("6 of 8 glasses")).toBeTruthy();
		await fireEvent.press(screen.getByRole("button", { name: /^Increase/ }));
		await fireEvent.press(screen.getByRole("button", { name: /^Decrease/ }));
		expect(onChange.mock.calls).toEqual([[7], [5]]);
	});
});
