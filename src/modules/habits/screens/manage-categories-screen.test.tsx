import {
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";
import type { ManageCategoriesView } from "../hooks/use-manage-categories-queries";
import {
	makeCategory,
	TEST_BUILT_IN_CATEGORIES,
} from "../test-support/habit-builder";

const music = makeCategory({ id: 11, name: "Music" });
const garden = makeCategory({
	id: 12,
	name: "Garden",
	shape: "square",
	hue: 95,
});

let mockView: ManageCategoriesView;
jest.mock("../hooks/use-manage-categories-queries", () => ({
	useManageCategoriesQueries: () => mockView,
}));
const mockRename = jest.fn();
const mockDelete = jest.fn();
const mockCreate = jest.fn();
let mockIsDeleting = false;
jest.mock("../hooks/use-category-actions", () => ({
	useCategoryActions: () => ({
		createCategory: mockCreate,
		isCreating: false,
		renameCategory: mockRename,
		isRenaming: false,
		deleteCategory: mockDelete,
		isDeleting: mockIsDeleting,
	}),
}));

import { failureMessage } from "@/utils/failure-message";
import { runSafely } from "@/utils/run-safely";
import { ManageCategoriesScreen } from "./manage-categories-screen";

function viewWith(
	customs: ManageCategoriesView["customs"],
	builtInHabits: Record<string, string[]> = {},
): ManageCategoriesView {
	return {
		builtIns: TEST_BUILT_IN_CATEGORIES.map((category) => ({
			category,
			habitNames: builtInHabits[category.name] ?? [],
		})),
		customs,
		categories: [
			...TEST_BUILT_IN_CATEGORIES,
			...customs.map((row) => row.category),
		],
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	mockIsDeleting = false;
	useToastStore.setState({ toast: null });
	mockRename.mockResolvedValue(undefined);
	mockDelete.mockResolvedValue({ ok: true, value: undefined });
	mockView = viewWith(
		[
			{
				category: music,
				habitNames: ["Piano practice", "Guitar scales", "Ear training"],
			},
			{ category: garden, habitNames: [] },
		],
		{ Fitness: ["Morning run", "Stretch"], Health: ["Take vitamins"] },
	);
});

describe("ManageCategoriesScreen (HAB-25)", () => {
	it("lists built-ins first, locked: count + Built-in tag, no actions, chips not buttons", async () => {
		await render(<ManageCategoriesScreen />);

		expect(screen.getByText("Categories")).toBeTruthy();
		expect(screen.getAllByText("Built-in")).toHaveLength(11); // header + 10 tags
		expect(screen.getByText("2 habits")).toBeTruthy();
		expect(screen.getByText("1 habit")).toBeTruthy();
		for (const name of ["Health", "Other"]) {
			expect(screen.getByLabelText(name)).toBeTruthy();
			expect(screen.queryByRole("button", { name })).toBeNull();
			expect(
				screen.queryByRole("button", { name: `Rename ${name}` }),
			).toBeNull();
			expect(
				screen.queryByRole("button", { name: `Delete ${name}` }),
			).toBeNull();
		}
	});

	it("lists customs in creation order with counts and labelled Rename / Delete", async () => {
		await render(<ManageCategoriesScreen />);

		expect(screen.getByText("3 habits")).toBeTruthy();
		const labels = screen
			.getAllByRole("button", { name: /^(Rename|Delete) / })
			.map((button) => button.props.accessibilityLabel);
		expect(labels).toEqual([
			"Rename Music",
			"Delete Music",
			"Rename Garden",
			"Delete Garden",
		]);
		// Garden is unused.
		expect(screen.getAllByText("Not used").length).toBeGreaterThan(0);
	});

	it("with no customs, Yours holds only Add category", async () => {
		mockView = viewWith([]);
		await render(<ManageCategoriesScreen />);
		expect(screen.getByText("Yours")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Add category" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: /^Rename / })).toBeNull();
	});

	it("renames inline", async () => {
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(screen.getByRole("button", { name: "Rename Music" }));
		await fireEvent.changeText(screen.getByLabelText("Rename Music"), "Piano");
		await fireEvent.press(
			screen.getByRole("button", { name: "Save new name for Music" }),
		);

		await waitFor(() => expect(mockRename).toHaveBeenCalledWith(11, "Piano"));
		// Back to the plain row: the field (and its typed value) is gone.
		await waitFor(() => expect(screen.queryByDisplayValue("Piano")).toBeNull());
	});

	it("deletes an unused category with a plain confirm", async () => {
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Delete Garden" }),
		);

		expect(screen.getByText("Delete “Garden”?")).toBeTruthy();
		expect(screen.queryByTestId("category-move-preview")).toBeNull();
		await fireEvent.press(screen.getByText("Delete category"));

		await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(12));
		await waitFor(() =>
			expect(screen.queryByText("Delete “Garden”?")).toBeNull(),
		);
	});

	it("deletes an in-use category, moving its habits to Other in the same action", async () => {
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(screen.getByRole("button", { name: "Delete Music" }));

		expect(screen.getByTestId("category-move-preview")).toBeTruthy();
		expect(
			screen.getByText("Piano practice · Guitar scales · Ear training"),
		).toBeTruthy();
		await fireEvent.press(screen.getByText("Delete and move 3 habits"));

		await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(11));
	});

	it("a failed delete keeps the sheet open, says so, and a retry works", async () => {
		useToastStore.setState({ toast: null });
		// What the real hook's `run` does with a failing delete.
		mockDelete.mockImplementationOnce(() =>
			runSafely(
				{
					scope: "categories",
					failure: failureMessage("delete", "this category"),
				},
				async () => {
					throw new Error("disk full");
				},
			),
		);
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Delete Garden" }),
		);
		await fireEvent.press(screen.getByText("Delete category"));

		await waitFor(() =>
			expect(useToastStore.getState().toast).toMatchObject({
				message: "Couldn't delete this category. Try again.",
				tone: "error",
			}),
		);
		expect(screen.getByText("Delete “Garden”?")).toBeTruthy();

		await fireEvent.press(screen.getByText("Delete category"));
		await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(2));
		await waitFor(() =>
			expect(screen.queryByText("Delete “Garden”?")).toBeNull(),
		);
	});

	it("Delete is inert while a delete is pending", async () => {
		mockIsDeleting = true;
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Delete Garden" }),
		);
		await fireEvent.press(screen.getByText("Delete category"));
		expect(mockDelete).not.toHaveBeenCalled();
	});

	it("Add category opens the add sheet", async () => {
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(screen.getByRole("button", { name: "Add category" }));
		expect(screen.getByText("New category")).toBeTruthy();
	});

	it("reads the count live: a habit added while the sheet is open updates the copy and the button", async () => {
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Delete Garden" }),
		);
		expect(screen.getByText("Delete category")).toBeTruthy();

		mockView = viewWith([
			{
				category: music,
				habitNames: ["Piano practice", "Guitar scales", "Ear training"],
			},
			{ category: garden, habitNames: ["Weed beds"] },
		]);
		await screen.rerender(<ManageCategoriesScreen />);

		expect(screen.getByText("Delete and move 1 habit")).toBeTruthy();
		expect(screen.getByText("Weed beds")).toBeTruthy();
		expect(screen.queryByText("Delete category")).toBeNull();
	});

	it("closes the sheet if the category disappears while it's open", async () => {
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Delete Garden" }),
		);

		mockView = viewWith([
			{
				category: music,
				habitNames: ["Piano practice", "Guitar scales", "Ear training"],
			},
		]);
		await screen.rerender(<ManageCategoriesScreen />);

		expect(screen.queryByText("Cancel")).toBeNull();
	});
});
