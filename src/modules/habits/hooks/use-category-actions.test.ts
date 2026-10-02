import { act, renderHook } from "@testing-library/react-native";
import { makeCategory } from "../test-support/habit-builder";

const mockCreateCategory = jest.fn();
jest.mock("../repositories/category-repository", () => ({
	createCategory: (...args: unknown[]) => mockCreateCategory(...args),
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
				shape: "diamond",
				hue: 175,
			});
		});

		expect(mockCreateCategory).toHaveBeenCalledWith({
			name: "Journaling",
			shape: "diamond",
			hue: 175,
		});
		expect(returned).toBe(created);
	});
});
