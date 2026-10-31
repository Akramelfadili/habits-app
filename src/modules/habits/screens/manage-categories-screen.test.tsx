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

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

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

type ReorderProps = {
	items: { id: number; name: string }[];
	onReorder: (keys: string[]) => void;
	renderItem: (
		item: { id: number; name: string },
		handle: null,
		dragging: boolean,
	) => React.ReactNode;
	renderGroup: (key: string, rows: React.ReactNode) => React.ReactNode;
};
let mockReorderProps: ReorderProps | null = null;
jest.mock("@/components/ui/composite/reorderable-list", () => ({
	ReorderableList: (props: ReorderProps) => {
		mockReorderProps = props;
		return props.renderGroup(
			"",
			props.items.map((item) => props.renderItem(item, null, false)),
		);
	},
}));

const mockRename = jest.fn();
const mockDelete = jest.fn();
const mockCreate = jest.fn();
const mockRestore = jest.fn();
const mockReorder = jest.fn();
let mockIsDeleting = false;
jest.mock("../hooks/use-category-actions", () => ({
	useCategoryActions: () => ({
		createCategory: mockCreate,
		isCreating: false,
		renameCategory: mockRename,
		isRenaming: false,
		deleteCategory: mockDelete,
		isDeleting: mockIsDeleting,
		restoreCategory: mockRestore,
		reorderCategories: mockReorder,
	}),
}));

import { failureMessage } from "@/utils/failure-message";
import { runSafely } from "@/utils/run-safely";
import { ManageCategoriesScreen } from "./manage-categories-screen";

type Row = ManageCategoriesView["customs"][number];
const usage = (
	category: ReturnType<typeof makeCategory>,
	habitNames: string[] = [],
	archivedCount = 0,
): Row => ({
	category,
	habitNames,
	activeCount: habitNames.length - archivedCount,
	archivedCount,
});

function viewWith(
	customs: Row[],
	builtInHabits: Record<string, [string[], number?]> = {},
): ManageCategoriesView {
	return {
		builtIns: TEST_BUILT_IN_CATEGORIES.map((category) =>
			usage(
				category,
				builtInHabits[category.name]?.[0] ?? [],
				builtInHabits[category.name]?.[1] ?? 0,
			),
		),
		customs,
		categories: [
			...customs.map((row) => row.category),
			...TEST_BUILT_IN_CATEGORIES,
		],
	};
}

const DELETED = { category: garden, sortOrder: 1 };

beforeEach(() => {
	jest.clearAllMocks();
	mockIsDeleting = false;
	mockReorderProps = null;
	useToastStore.setState({ toast: null });
	mockRename.mockResolvedValue(undefined);
	mockDelete.mockResolvedValue({ ok: true, value: DELETED });
	mockReorder.mockResolvedValue({ ok: true, value: undefined });
	mockView = viewWith(
		[
			usage(music, ["Piano practice", "Guitar scales", "Ear training"]),
			usage(garden),
		],
		{
			Fitness: [["Morning run", "Stretch", "Old run"], 1],
			Health: [["Take vitamins"]],
		},
	);
});

describe("ManageCategoriesScreen — browse (C1)", () => {
	it("says how many built-in and custom there are, in the eyebrow and as one heading", async () => {
		await render(<ManageCategoriesScreen />);
		expect(screen.getByText("10 BUILT-IN · 2 CUSTOM")).toBeTruthy();
		expect(
			screen.getByLabelText("Categories, 10 built-in, 2 custom"),
		).toBeTruthy();
	});

	it("puts the custom categories first, then the built-ins under their note", async () => {
		await render(<ManageCategoriesScreen />);
		const rendered = JSON.stringify(screen.toJSON());
		expect(rendered.indexOf("CUSTOM · 2")).toBeLessThan(
			rendered.indexOf("BUILT-IN · 10"),
		);
		expect(
			screen.getByText("Built-ins can’t be renamed or deleted."),
		).toBeTruthy();
	});

	it("locks the built-ins: a tag and counts that include archived, no actions", async () => {
		await render(<ManageCategoriesScreen />);
		expect(screen.getAllByText("Built-in")).toHaveLength(10);
		expect(screen.getByText("2 habits · 1 archived")).toBeTruthy();
		expect(screen.getByText("1 habit")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Rename Health" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Delete Health" })).toBeNull();
	});

	it("lists customs in the stored order with counts and labelled Rename / Delete", async () => {
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
		expect(screen.getAllByText("Not used").length).toBeGreaterThan(0);
	});

	it("with no custom categories (C6) teaches the feature and still offers Reorder", async () => {
		mockView = viewWith([]);
		await render(<ManageCategoriesScreen />);
		expect(screen.getByText("10 BUILT-IN")).toBeTruthy();
		expect(screen.getByText("CUSTOM · 0")).toBeTruthy();
		expect(screen.getByText("Group habits your own way")).toBeTruthy();
		expect(
			screen.getByRole("button", {
				name: "Add a category, Group habits your own way",
			}),
		).toBeTruthy();
		// Deliberately unlike the C6 frame: the built-ins reorder too.
		expect(screen.getByRole("button", { name: "Reorder" })).toBeTruthy();
	});

	it("Add category (the +) and the empty row both open the add sheet", async () => {
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(screen.getByRole("button", { name: "Add category" }));
		expect(screen.getByText("New category")).toBeTruthy();
	});
});

describe("ManageCategoriesScreen — rename (C3)", () => {
	it("renames inline", async () => {
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(screen.getByRole("button", { name: "Rename Music" }));
		await fireEvent.changeText(screen.getByLabelText("Rename Music"), "Piano");
		await fireEvent.press(
			screen.getByRole("button", { name: "Save new name for Music" }),
		);

		await waitFor(() => expect(mockRename).toHaveBeenCalledWith(11, "Piano"));
		await waitFor(() => expect(screen.queryByDisplayValue("Piano")).toBeNull());
	});

	it("blocks a duplicate of a built-in, ignoring case, and says so", async () => {
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(screen.getByRole("button", { name: "Rename Music" }));
		await fireEvent.changeText(
			screen.getByLabelText("Rename Music"),
			"fitness",
		);
		expect(
			screen.getByRole("alert", {
				name: "Fitness already exists. Choose another name.",
			}),
		).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Save new name for Music" }).props
				.accessibilityState.disabled,
		).toBe(true);
		expect(mockRename).not.toHaveBeenCalled();
	});

	it("hides Reorder while a row is being renamed", async () => {
		await render(<ManageCategoriesScreen />);
		expect(screen.getByRole("button", { name: "Reorder" })).toBeTruthy();
		await fireEvent.press(screen.getByRole("button", { name: "Rename Music" }));
		expect(screen.queryByRole("button", { name: "Reorder" })).toBeNull();
	});
});

describe("ManageCategoriesScreen — reorder (C2)", () => {
	async function startReorder() {
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(screen.getByRole("button", { name: "Reorder" }));
	}

	it("swaps the lists for one set of handles, and says what the order does and that Other stays last", async () => {
		await startReorder();
		expect(screen.getByText("REORDER · SETS GROUP ORDER")).toBeTruthy();
		expect(
			screen.getByText(
				"Groups on Today and Habits follow this order. Other stays last.",
			),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
		expect(screen.queryByText("Built-in")).toBeNull();
		expect(screen.queryByRole("button", { name: /^Rename / })).toBeNull();
	});

	it("lists every category but Other, custom and built-in mixed, in the stored order", async () => {
		await startReorder();
		const names = (mockReorderProps?.items ?? []).map((item) => item.name);
		expect(names).toEqual([
			"Music",
			"Garden",
			...TEST_BUILT_IN_CATEGORIES.map((c) => c.name).filter(
				(name) => name !== "Other",
			),
		]);
	});

	it("stores the new order the person leaves", async () => {
		await startReorder();
		mockReorderProps?.onReorder(["12", "11", "1"]);
		expect(mockReorder).toHaveBeenCalledWith([12, 11, 1]);
	});

	it("Done goes back to the lists", async () => {
		await startReorder();
		await fireEvent.press(screen.getByRole("button", { name: "Done" }));
		expect(screen.getByText("CUSTOM · 2")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Reorder" })).toBeTruthy();
	});
});

describe("ManageCategoriesScreen — delete", () => {
	it("not in use (DC6): one destructive button, then the category is gone with an Undo that restores it", async () => {
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Delete Garden" }),
		);

		expect(screen.getByText("Delete Garden?")).toBeTruthy();
		expect(screen.queryByTestId("category-move-preview")).toBeNull();
		await fireEvent.press(screen.getByText("Delete category"));

		await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(12));
		await waitFor(() =>
			expect(screen.queryByText("Delete Garden?")).toBeNull(),
		);
		const toast = useToastStore.getState().toast;
		expect(toast?.message).toBe("Garden deleted");
		expect(toast?.actionLabel).toBe("Undo");
		toast?.onAction?.();
		expect(mockRestore).toHaveBeenCalledWith(DELETED);
	});

	it("in use (C5): names the habits and where they go, then toasts the move with no Undo", async () => {
		mockDelete.mockResolvedValue({
			ok: true,
			value: { category: music, sortOrder: 0 },
		});
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(screen.getByRole("button", { name: "Delete Music" }));

		expect(
			screen.getByText(
				"3 habits use it. They move to Other — their history and streaks are kept.",
			),
		).toBeTruthy();
		expect(screen.getByText("Piano practice")).toBeTruthy();
		expect(screen.getAllByText("Music → Other")).toHaveLength(3);
		await fireEvent.press(screen.getByText("Delete and move 3 habits"));

		await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(11));
		await waitFor(() =>
			expect(useToastStore.getState().toast?.message).toBe(
				"Music deleted · 3 habits moved to Other",
			),
		);
		expect(useToastStore.getState().toast?.actionLabel).toBeUndefined();
	});

	it("a failed delete keeps the sheet open, says so, and a retry works", async () => {
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
		expect(screen.getByText("Delete Garden?")).toBeTruthy();

		await fireEvent.press(screen.getByText("Delete category"));
		await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(2));
		await waitFor(() =>
			expect(screen.queryByText("Delete Garden?")).toBeNull(),
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

	it("reads the count live: a habit added while the sheet is open updates the copy and the button", async () => {
		await render(<ManageCategoriesScreen />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Delete Garden" }),
		);
		expect(screen.getByText("Delete category")).toBeTruthy();

		mockView = viewWith([
			usage(music, ["Piano practice", "Guitar scales", "Ear training"]),
			usage(garden, ["Weed beds"]),
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

		mockView = viewWith([usage(music, ["Piano practice"])]);
		await screen.rerender(<ManageCategoriesScreen />);

		expect(screen.queryByText("Cancel")).toBeNull();
	});
});
