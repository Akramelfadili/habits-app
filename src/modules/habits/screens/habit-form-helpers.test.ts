import {
	NO_NAME_MESSAGE,
	SHORTEN_NAME_MESSAGE,
	saveBlockedReason,
} from "./habit-form-helpers";
import { NO_CATEGORY_MESSAGE } from "./habit-form-schema";

describe("saveBlockedReason", () => {
	it("shows only the name reason when both name and category are missing", () => {
		expect(saveBlockedReason({ name: "", categoryId: null })).toBe(
			NO_NAME_MESSAGE,
		);
	});

	it("treats a whitespace-only name as missing", () => {
		expect(saveBlockedReason({ name: "   ", categoryId: 3 })).toBe(
			NO_NAME_MESSAGE,
		);
	});

	it("shows the category reason once a name exists", () => {
		expect(saveBlockedReason({ name: "Read", categoryId: null })).toBe(
			NO_CATEGORY_MESSAGE,
		);
	});

	it("gives no reason when both are present", () => {
		expect(saveBlockedReason({ name: "Read", categoryId: 3 })).toBeUndefined();
	});

	it("blocks an edited V1 name still over 32, ahead of the category reason", () => {
		const originalName = "a".repeat(38);
		expect(
			saveBlockedReason({
				name: "a".repeat(35),
				categoryId: null,
				originalName,
			}),
		).toBe(SHORTEN_NAME_MESSAGE);
	});

	it("lets an unchanged V1 name over 32 through", () => {
		const originalName = "a".repeat(38);
		expect(
			saveBlockedReason({ name: originalName, categoryId: 3, originalName }),
		).toBeUndefined();
	});
});
