import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text, View } from "react-native";
import { ReorderableList } from "./reorderable-list";

type Row = { id: string; group: string };

const rows: Row[] = [
	{ id: "water", group: "Morning" },
	{ id: "meditate", group: "Morning" },
	{ id: "read", group: "Evening" },
];

async function renderList(onReorder = jest.fn()) {
	await render(
		<ReorderableList
			items={rows}
			keyOf={(row) => row.id}
			groupOf={(row) => row.group}
			handleLabel={(row) => `Reorder ${row.id}`}
			onReorder={onReorder}
			renderItem={(row, handle) => (
				<View>
					<Text>{row.id}</Text>
					{handle}
				</View>
			)}
		/>,
	);
	return onReorder;
}

function moveAction(label: string, actionName: "moveUp" | "moveDown") {
	return fireEvent(screen.getByLabelText(label), "accessibilityAction", {
		nativeEvent: { actionName },
	});
}

describe("ReorderableList", () => {
	it("renders every row with its own grip", async () => {
		await renderList();
		expect(screen.getByText("read")).toBeTruthy();
		expect(screen.getAllByTestId("drag-handle")).toHaveLength(3);
	});

	it("moves a row within its group and reports only that group's new order", async () => {
		const onReorder = await renderList();

		await moveAction("Reorder meditate", "moveUp");

		expect(onReorder).toHaveBeenCalledWith(["meditate", "water"]);
		expect(
			screen
				.getAllByText(/^(water|meditate|read)$/)
				.map((n) => n.props.children),
		).toEqual(["meditate", "water", "read"]);
	});

	it("won't move a row out of its group", async () => {
		const onReorder = await renderList();

		await moveAction("Reorder meditate", "moveDown");
		await moveAction("Reorder read", "moveUp");

		expect(onReorder).not.toHaveBeenCalled();
	});
});
