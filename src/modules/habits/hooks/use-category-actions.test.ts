import { act, renderHook } from "@testing-library/react-native";
import { makeCategory } from "../test-support/habit-builder";

const mockCreateCategory = jest.fn();
const mockRenameCategory = jest.fn();
const mockDeleteCategory = jest.fn();
const mockReorderCategories = jest.fn();
const mockRestoreCategory = jest.fn();
jest.mock("../repositories/category-repository", () => ({
	createCategory: (...args: unknown[]) => mockCreateCategory(...args),
	renameCategory: (...args: unknown[]) => mockRenameCategory(...args),
	deleteCategory: (...args: unknown[]) => mockDeleteCategory(...args),
	reorderCategories: (...args: unknown[]) => mockReorderCategories(...args),
	restoreCategory: (...args: unknown[]) => mockRestoreCategory(...args),
}));

import { useCategoryActions } from "./use-category-actions";

describe("useCategoryActions", () => {
	it("creates a category with the given name and appearance", async () => {
		const created = makeCategory({ name: "Journaling" });
		mockCreateCategory.mockResolvedValue(created);
		const { result } = await renderHook(() => useCategoryActions());

		let returned: unknown;
		await act(async () => {
			returned = await result.current.createCategory({
				name: "Journaling",
				shape: "ring",
				hue: 330,
			});
		});

		expect(mockCreateCategory).toHaveBeenCalledWith({
			name: "Journaling",
			shape: "ring",
			hue: 330,
		});
		expect(returned).toBe(created);
	});

	it("renames through the repository (HAB-25)", async () => {
		mockRenameCategory.mockResolvedValue(makeCategory({ name: "Piano" }));
		const { result } = await renderHook(() => useCategoryActions());

		await act(async () => {
			await result.current.renameCategory(11, "Piano");
		});

		expect(mockRenameCategory).toHaveBeenCalledWith(11, "Piano");
	});

	it("reports isDeleting while a delete is in flight (HAB-25)", async () => {
		let finish!: () => void;
		mockDeleteCategory.mockReturnValue(
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
		);
		const { result } = await renderHook(() => useCategoryActions());

		let pending!: Promise<unknown>;
		await act(async () => {
			pending = result.current.deleteCategory(11);
		});
		expect(result.current.isDeleting).toBe(true);
		expect(mockDeleteCategory).toHaveBeenCalledWith(11);

		await act(async () => {
			finish();
			await pending;
		});
		expect(result.current.isDeleting).toBe(false);
	});

	it("reorders and restores through the repository, never rejecting", async () => {
		mockReorderCategories.mockResolvedValue(undefined);
		mockRestoreCategory.mockRejectedValue(new Error("nope"));
		const { result } = await renderHook(() => useCategoryActions());

		await act(async () => {
			expect(await result.current.reorderCategories([3, 1, 2])).toMatchObject({
				ok: true,
			});
		});
		expect(mockReorderCategories).toHaveBeenCalledWith([3, 1, 2]);

		await act(async () => {
			const restored = await result.current.restoreCategory({
				category: makeCategory(),
				sortOrder: 4,
			});
			expect(restored.ok).toBe(false);
		});
	});
});
