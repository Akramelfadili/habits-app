import { fireEvent, render, screen } from "@testing-library/react-native";
import { builtInCategory, makeCategory } from "../test-support/habit-builder";
import type { CategoryUsage } from "../types";
import { DeleteCategorySheet } from "./delete-category-sheet";

const other = builtInCategory("Other");
const music = makeCategory({ id: 11, name: "Music" });

const usage = (habitNames: string[]): CategoryUsage => ({
	category: music,
	habitNames,
	activeCount: habitNames.length,
	archivedCount: 0,
});

function renderSheet(value: CategoryUsage | null, isWorking = false) {
	const props = { onKeep: jest.fn(), onConfirm: jest.fn() };
	return render(
		<DeleteCategorySheet
			usage={value}
			other={other}
			isWorking={isWorking}
			{...props}
		/>,
	).then(() => props);
}

describe("DeleteCategorySheet (C5, DC6)", () => {
	it("not in use (DC6): one destructive button and Cancel, no move preview", async () => {
		const props = await renderSheet(usage([]));
		expect(screen.getByText("Delete Music?")).toBeTruthy();
		expect(
			screen.getByText("No habit uses it, so nothing else changes."),
		).toBeTruthy();
		expect(screen.queryByTestId("category-move-preview")).toBeNull();
		await fireEvent.press(screen.getByText("Delete category"));
		expect(props.onConfirm).toHaveBeenCalledTimes(1);
		await fireEvent.press(screen.getByText("Cancel"));
		expect(props.onKeep).toHaveBeenCalledTimes(1);
	});

	it("in use (C5): says history and streak are kept and lists each habit's move", async () => {
		const props = await renderSheet(
			usage(["Piano practice", "Guitar scales", "Ear training"]),
		);
		expect(
			screen.getByText(
				"3 habits use it. They move to Other — their history and streaks are kept.",
			),
		).toBeTruthy();
		expect(screen.getByTestId("category-move-preview")).toBeTruthy();
		expect(screen.getByText("Piano practice")).toBeTruthy();
		expect(screen.getAllByText("Music → Other")).toHaveLength(3);
		await fireEvent.press(screen.getByText("Delete and move 3 habits"));
		expect(props.onConfirm).toHaveBeenCalled();
	});

	it("in use by one habit: singular copy and button", async () => {
		await renderSheet(usage(["Piano practice"]));
		expect(
			screen.getByText(
				"1 habit uses it. It moves to Other — its history and streak are kept.",
			),
		).toBeTruthy();
		expect(screen.getByText("Delete and move 1 habit")).toBeTruthy();
	});

	it("disables Delete while the delete is pending", async () => {
		const props = await renderSheet(usage(["Piano practice"]), true);
		await fireEvent.press(screen.getByText("Delete and move 1 habit"));
		expect(props.onConfirm).not.toHaveBeenCalled();
	});

	it("is closed while there's nothing to delete", async () => {
		await renderSheet(null);
		expect(screen.queryByText("Cancel")).toBeNull();
	});
});
