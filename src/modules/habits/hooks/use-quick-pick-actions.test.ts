import { renderHook } from "@testing-library/react-native";
import { FIRST_RUN_QUICK_PICK_IDS, findSuggestion } from "../suggestions";
import { useQuickPickActions } from "./use-quick-pick-actions";

const suggestion = findSuggestion(FIRST_RUN_QUICK_PICK_IDS[0]);

describe("useQuickPickActions", () => {
	it("fills the name and the fields the suggestion knows", async () => {
		const setValue = jest.fn();
		const { result } = await renderHook(() =>
			useQuickPickActions({ setValue, categories: [] }),
		);
		result.current.pickSuggestion(suggestion as NonNullable<typeof suggestion>);
		const keys = setValue.mock.calls.map(([key]) => key);
		expect(keys).toContain("name");
		expect(setValue).toHaveBeenCalledWith("name", suggestion?.name, {
			shouldDirty: true,
		});
	});

	it("drops the hidden category and target when the picked name is changed", async () => {
		const setValue = jest.fn();
		const { result } = await renderHook(() =>
			useQuickPickActions({ setValue, categories: [] }),
		);
		result.current.pickSuggestion(suggestion as NonNullable<typeof suggestion>);
		setValue.mockClear();
		result.current.changeName("Something else");
		const keys = setValue.mock.calls.map(([key]) => key);
		expect(keys).toEqual([
			"categoryId",
			"targetType",
			"targetAmount",
			"targetUnit",
			"name",
		]);
	});

	it("only sets the name when nothing was picked, or the pick is kept", async () => {
		const setValue = jest.fn();
		const { result } = await renderHook(() =>
			useQuickPickActions({ setValue, categories: [] }),
		);
		result.current.changeName("Yoga");
		expect(setValue.mock.calls.map(([key]) => key)).toEqual(["name"]);
	});
});
