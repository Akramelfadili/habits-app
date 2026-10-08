import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { OffScheduleRow } from "./off-schedule-row";

const walk = makeHabit({ id: 4, name: "Walk" });
const entry = {
	id: 1,
	habitId: 4,
	date: "2026-10-04",
	createdAt: new Date(2026, 9, 4, 10, 42),
};

describe("OffScheduleRow", () => {
	it("shows the habit, when it was logged and that the streak is unchanged", async () => {
		await render(
			<OffScheduleRow habit={walk} entry={entry} onPress={jest.fn()} />,
		);

		expect(screen.getByText("Walk")).toBeTruthy();
		expect(
			screen.getByText("Logged 10:42 · bonus, streak unchanged"),
		).toBeTruthy();
		expect(
			screen.getByRole("checkbox", {
				name: "Walk, logged off-schedule — open",
			}),
		).toBeChecked();
	});

	it("opens Detail from the row and from the check", async () => {
		const onPress = jest.fn();
		await render(
			<OffScheduleRow habit={walk} entry={entry} onPress={onPress} />,
		);

		await fireEvent.press(screen.getByLabelText("Walk, logged off-schedule"));
		await fireEvent.press(
			screen.getByRole("checkbox", {
				name: "Walk, logged off-schedule — open",
			}),
		);

		expect(onPress).toHaveBeenCalledTimes(2);
	});
});
