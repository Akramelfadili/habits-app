import { renderHook } from "@testing-library/react-native";
import { TEST_BUILT_IN_CATEGORIES } from "../test-support/habit-builder";

jest.mock("../repositories/category-repository", () => ({
	useCategories: () =>
		jest.requireActual("../test-support/habit-builder")
			.TEST_BUILT_IN_CATEGORIES,
}));

import { useCategoryQueries } from "./use-category-queries";

describe("useCategoryQueries", () => {
	it("returns the repository's categories as-is, in order", async () => {
		const { result } = await renderHook(() => useCategoryQueries());
		expect(result.current.categories).toEqual(TEST_BUILT_IN_CATEGORIES);
	});
});
