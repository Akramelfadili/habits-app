import {
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react-native";
import type { RetroLogDay } from "../hooks/use-retro-log-queries";
import { makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("../repositories/frozen-day-repository", () => ({}));

import { MAX_NOTE_LENGTH } from "../constants";
import { RetroLogSheet } from "./retro-log-sheet";

const water = makeHabit({
	id: 1,
	name: "Glass of water",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});
const meditate = makeHabit({ id: 2, name: "Meditate" });
const read = makeHabit({ id: 3, name: "Read" });

function day(overrides: Partial<RetroLogDay> = {}): RetroLogDay {
	return {
		date: new Date(2026, 8, 8),
		habits: [water, meditate, read],
		values: { 1: 8, 2: false, 3: true },
		note: "",
		...overrides,
	};
}

async function renderSheet(value: RetroLogDay | null = day()) {
	const onSave = jest.fn();
	const onDismiss = jest.fn();
	await render(
		<RetroLogSheet day={value} onDismiss={onDismiss} onSave={onSave} />,
	);
	return { onSave, onDismiss };
}

describe("RetroLogSheet", () => {
	it("shows the date, the day's habits with their saved checks, and the note", async () => {
		await renderSheet(day({ note: "Travel day" }));

		expect(
			screen.getByRole("header", { name: "Tuesday, 8 September" }),
		).toBeTruthy();
		// A quantity habit has its stepper, not a checkbox.
		expect(screen.getByText("8")).toBeTruthy();
		expect(
			screen.queryByRole("checkbox", { name: /Glass of water/ }),
		).toBeNull();
		expect(
			screen.getByRole("checkbox", { name: "Meditate, done" }),
		).not.toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Read, done" })).toBeChecked();
		expect(screen.getByDisplayValue("Travel day")).toBeTruthy();
	});

	it("renders nothing while no day is selected", async () => {
		await renderSheet(null);
		expect(screen.queryByText("Save changes")).toBeNull();
	});

	it("keeps Save disabled until something changes", async () => {
		await renderSheet();
		expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

		await fireEvent.press(
			screen.getByRole("checkbox", { name: "Meditate, done" }),
		);
		expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
	});

	it("saves only the changed values, plus the note", async () => {
		const { onSave } = await renderSheet();

		await fireEvent.press(
			screen.getByRole("checkbox", { name: "Meditate, done" }),
		);
		await fireEvent.press(screen.getByRole("button", { name: /^Decrease/ }));
		await fireEvent.press(screen.getByRole("button", { name: /^Decrease/ }));
		await fireEvent.press(screen.getByRole("button", { name: /^Decrease/ }));
		await fireEvent.press(screen.getByRole("button", { name: /^Decrease/ }));
		await fireEvent.press(screen.getByRole("button", { name: /^Decrease/ }));
		await fireEvent.press(screen.getByRole("button", { name: /^Decrease/ }));
		await fireEvent.press(screen.getByRole("button", { name: /^Decrease/ }));
		await fireEvent.press(screen.getByRole("button", { name: /^Decrease/ }));
		await fireEvent.changeText(screen.getByDisplayValue(""), "Hotel");
		await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

		expect(onSave).toHaveBeenCalledWith(
			[
				{ habitId: 1, value: 0 },
				{ habitId: 2, value: true },
			],
			"Hotel",
		);
	});

	it("adding only a note leaves every value as-is", async () => {
		const { onSave } = await renderSheet();

		await fireEvent.changeText(screen.getByDisplayValue(""), "Easy day");
		await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

		expect(onSave).toHaveBeenCalledWith([], "Easy day");
	});

	it("sets an exact amount through the quantity row's inline stepper", async () => {
		const { onSave } = await renderSheet();

		await fireEvent.press(screen.getByRole("button", { name: /^Decrease/ }));
		await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

		expect(onSave).toHaveBeenCalledWith([{ habitId: 1, value: 7 }], "");
	});

	it("pins the opened-from habit first, in the selected card, ahead of 'Also on Tuesday'", async () => {
		await renderSheet(day({ habits: [meditate, water, read] }));

		const rows = screen.getAllByTestId("list-item");
		expect(within(rows[0]).getByText("Meditate")).toBeTruthy();
		expect(within(rows[1]).getByText("Glass of water")).toBeTruthy();
		expect(within(rows[2]).getByText("Read")).toBeTruthy();
		// Only the origin sits in the ink-ringed (selected) card.
		expect(rows[0].parent).toHaveStyle({ borderWidth: 1.5 });
		expect(rows[1].parent).not.toHaveStyle({ borderWidth: 1.5 });
		expect(screen.getByText("The habit you opened this day from")).toBeTruthy();
		expect(screen.getByText("ALSO ON TUESDAY")).toBeTruthy();
	});

	it("keeps unchecked rows at full strength — never dimmed", async () => {
		await renderSheet();
		for (const content of screen.getAllByTestId("list-item-content")) {
			expect(content).not.toHaveStyle({ opacity: 0.5 });
		}
	});

	it("caps the note input at the soft limit", async () => {
		await renderSheet();
		expect(screen.getByDisplayValue("").props.maxLength).toBe(MAX_NOTE_LENGTH);
	});

	it("Cancel dismisses without saving", async () => {
		const { onSave, onDismiss } = await renderSheet();
		await fireEvent.press(
			screen.getByRole("checkbox", { name: "Meditate, done" }),
		);
		await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));

		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(onSave).not.toHaveBeenCalled();
	});
});
