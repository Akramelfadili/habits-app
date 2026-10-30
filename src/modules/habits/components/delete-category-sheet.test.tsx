import { fireEvent, render, screen } from "@testing-library/react-native";
import { builtInCategory, makeCategory } from "../test-support/habit-builder";
import type { CategoryUsage } from "../types";
import { DeleteCategorySheet } from "./delete-category-sheet";

const other = builtInCategory("Other");
const music = makeCategory({ id: 11, name: "Music" });

function renderSheet(usage: CategoryUsage | null, isWorking = false) {
	const props = { onKeep: jest.fn(), onConfirm: jest.fn() };
	return render(
		<DeleteCategorySheet
			usage={usage}
			other={other}
			isWorking={isWorking}
			{...props}
		/>,
	).then(() => props);
}

describe("DeleteCategorySheet (HAB-25)", () => {
	it("unused (F4a): plain confirm, no move preview", async () => {
		await renderSheet({ category: music, habitNames: [] });
		expect(screen.getByText("Delete “Music”?")).toBeTruthy();
		expect(screen.queryByTestId("category-move-preview")).toBeNull();
		expect(screen.getByText("Delete category")).toBeTruthy();
	});

	it("in use (F4b): shows Music → Other with every affected habit, and the button repeats the count", async () => {
		const props = await renderSheet({
			category: music,
			habitNames: ["Piano practice", "Guitar scales", "Ear training"],
		});
		expect(screen.getByTestId("category-move-preview")).toBeTruthy();
		expect(screen.getByLabelText("Music")).toBeTruthy();
		expect(screen.getByLabelText("Other")).toBeTruthy();
		expect(
			screen.getByText("Piano practice · Guitar scales · Ear training"),
		).toBeTruthy();
		await fireEvent.press(screen.getByText("Delete and move 3 habits"));
		expect(props.onConfirm).toHaveBeenCalled();
	});

	it("in use by one habit: singular button label", async () => {
		await renderSheet({ category: music, habitNames: ["Piano practice"] });
		expect(screen.getByText("Delete and move 1 habit")).toBeTruthy();
	});

	it("disables Delete while the delete is pending", async () => {
		const props = await renderSheet(
			{ category: music, habitNames: ["Piano practice"] },
			true,
		);
		await fireEvent.press(screen.getByText("Delete and move 1 habit"));
		expect(props.onConfirm).not.toHaveBeenCalled();
	});

	it("is closed while there's nothing to delete", async () => {
		await renderSheet(null);
		expect(screen.queryByText("Cancel")).toBeNull();
	});
});
