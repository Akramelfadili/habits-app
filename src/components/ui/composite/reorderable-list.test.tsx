import {
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react-native";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
			moveLabels={{ up: "Move up", down: "Move down" }}
			moveButtonLabel={(row, direction) => `Move ${row.id} ${direction}`}
			onReorder={onReorder}
			renderItem={(row, handle) => (
				<View>
					<Text>{row.id}</Text>
					{handle}
				</View>
			)}
		/>,
		{ wrapper: GestureHandlerRootView },
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

	it("moves a row with its visible Move up and Move down buttons, no gesture needed", async () => {
		const onReorder = await renderList();

		await fireEvent.press(screen.getByLabelText("Move water down"));
		expect(onReorder).toHaveBeenLastCalledWith(["meditate", "water"]);
		await fireEvent.press(screen.getByLabelText("Move water up"));
		expect(onReorder).toHaveBeenLastCalledWith(["water", "meditate"]);
		expect(
			screen
				.getAllByText(/^(water|meditate|read)$/)
				.map((n) => n.props.children),
		).toEqual(["water", "meditate", "read"]);
	});

	it("disables the buttons at the ends of a group", async () => {
		await renderList();
		expect(
			screen.getByLabelText("Move water up").props.accessibilityState.disabled,
		).toBe(true);
		expect(
			screen.getByLabelText("Move meditate down").props.accessibilityState
				.disabled,
		).toBe(true);
		expect(
			screen.getByLabelText("Move read up").props.accessibilityState.disabled,
		).toBe(true);
		expect(
			screen.getByLabelText("Move read down").props.accessibilityState.disabled,
		).toBe(true);
	});

	it("won't move a row out of its group", async () => {
		const onReorder = await renderList();

		await moveAction("Reorder meditate", "moveDown");
		await moveAction("Reorder read", "moveUp");

		expect(onReorder).not.toHaveBeenCalled();
	});

	describe("renderGroup", () => {
		async function renderGrouped() {
			const onReorder = jest.fn();
			await render(
				<ReorderableList
					items={rows}
					keyOf={(row) => row.id}
					groupOf={(row) => row.group}
					handleLabel={(row) => `Reorder ${row.id}`}
					moveLabels={{ up: "Move up", down: "Move down" }}
					moveButtonLabel={(row, direction) => `Move ${row.id} ${direction}`}
					onReorder={onReorder}
					renderGroup={(key, children, { isDragging }) => (
						<View testID={`group-${key}`}>
							<Text>{isDragging ? `lifted ${key}` : key}</Text>
							{children}
						</View>
					)}
					renderItem={(row, handle) => (
						<View>
							<Text>{row.id}</Text>
							{handle}
						</View>
					)}
				/>,
				{ wrapper: GestureHandlerRootView },
			);
			return onReorder;
		}

		it("wraps each run of equal groups once, rows inside", async () => {
			await renderGrouped();
			const morning = screen.getByTestId("group-Morning");
			expect(within(morning).getByText("water")).toBeTruthy();
			expect(within(morning).getByText("meditate")).toBeTruthy();
			expect(within(morning).queryByText("read")).toBeNull();
			expect(
				within(screen.getByTestId("group-Evening")).getByText("read"),
			).toBeTruthy();
		});

		it("reports no group as dragging at rest", async () => {
			await renderGrouped();
			expect(screen.queryByText(/^lifted/)).toBeNull();
		});
	});
});
