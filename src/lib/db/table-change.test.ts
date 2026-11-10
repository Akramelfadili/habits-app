// This file tests the real module, not the Jest-wide stand-in from jest.setup.js.
jest.unmock("@/lib/db/table-change");

const mockRemove = jest.fn();
let mockListener: (event: { tableName: string }) => void = () => {};
jest.mock("expo-sqlite", () => ({
	addDatabaseChangeListener: (listener: typeof mockListener) => {
		mockListener = listener;
		return { remove: mockRemove };
	},
}));

import { onTableChange } from "./table-change";

describe("onTableChange", () => {
	it("calls back for the named table only, and stops when told", () => {
		const listener = jest.fn();
		const stop = onTableChange("entries", listener);

		mockListener({ tableName: "habits" });
		expect(listener).not.toHaveBeenCalled();
		mockListener({ tableName: "entries" });
		expect(listener).toHaveBeenCalledTimes(1);

		stop();
		expect(mockRemove).toHaveBeenCalledTimes(1);
	});
});
