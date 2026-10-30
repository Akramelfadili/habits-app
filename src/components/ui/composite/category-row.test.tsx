import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { CategoryRow } from "./category-row";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const accent = { tint: "#EEF", ink: "#00F" };
const base = {
	symbol: "leaf" as const,
	accent,
};

describe("CategoryRow", () => {
	it("built-in: name, count and a quiet tag, no actions at all", async () => {
		await render(
			<CategoryRow {...base} name="Health" meta="1 habit" tag="Built-in" />,
		);
		expect(screen.getByText("Health")).toBeTruthy();
		expect(screen.getByText("1 habit")).toBeTruthy();
		expect(screen.getByText("Built-in")).toBeTruthy();
		expect(screen.queryByRole("button", { name: /rename|delete/i })).toBeNull();
	});

	it("reads as one line for VoiceOver, saying it is built-in", async () => {
		await render(
			<CategoryRow
				{...base}
				name="Fitness"
				meta="2 habits · 1 archived"
				tag="Built-in"
			/>,
		);
		expect(
			screen.getByLabelText("Fitness, 2 habits · 1 archived, built-in"),
		).toBeTruthy();
	});

	it("custom: text actions labelled with what they act on", async () => {
		const onRename = jest.fn();
		const onDelete = jest.fn();
		await render(
			<CategoryRow
				{...base}
				name="Music"
				meta="Not used"
				actions={[
					{
						label: "Rename",
						accessibilityLabel: "Rename Music",
						onPress: onRename,
					},
					{
						label: "Delete",
						accessibilityLabel: "Delete Music",
						onPress: onDelete,
						destructive: true,
					},
				]}
			/>,
		);
		await fireEvent.press(screen.getByRole("button", { name: "Rename Music" }));
		await fireEvent.press(screen.getByRole("button", { name: "Delete Music" }));
		expect(onRename).toHaveBeenCalled();
		expect(onDelete).toHaveBeenCalled();
	});

	it("editing: the editor replaces the whole row", async () => {
		await render(
			<CategoryRow
				{...base}
				name="Music"
				meta="Not used"
				actions={[
					{
						label: "Rename",
						accessibilityLabel: "Rename Music",
						onPress: jest.fn(),
					},
				]}
				editor={<Text>editing</Text>}
			/>,
		);
		expect(screen.getByText("editing")).toBeTruthy();
		expect(screen.queryByText("Music")).toBeNull();
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("reorder: the handle replaces the actions and the move actions sit on the row", async () => {
		const onUp = jest.fn();
		await render(
			<CategoryRow
				{...base}
				name="Music"
				meta="Not used"
				handle={<Text>grip</Text>}
				actions={[
					{
						label: "Rename",
						accessibilityLabel: "Rename Music",
						onPress: jest.fn(),
					},
				]}
				accessibilityActions={[{ label: "Move up", onAction: onUp }]}
			/>,
		);
		expect(screen.getByText("grip")).toBeTruthy();
		expect(screen.queryByText("Rename")).toBeNull();
		const row = screen.getByLabelText("Music, Not used");
		await fireEvent(row, "accessibilityAction", {
			nativeEvent: { actionName: "Move up" },
		});
		expect(onUp).toHaveBeenCalled();
	});
});
