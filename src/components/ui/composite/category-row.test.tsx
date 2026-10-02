import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { CategoryRow } from "./category-row";

describe("CategoryRow", () => {
	it("built-in: count and a quiet tag, no actions at all", async () => {
		await render(
			<CategoryRow chip={<Text>Health</Text>} meta="1 habit" tag="Built-in" />,
		);
		expect(screen.getByText("1 habit")).toBeTruthy();
		expect(screen.getByText("Built-in")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("custom: text actions labelled with what they act on", async () => {
		const onRename = jest.fn();
		const onDelete = jest.fn();
		await render(
			<CategoryRow
				chip={<Text>Music</Text>}
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
				chip={<Text>Music</Text>}
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
});
