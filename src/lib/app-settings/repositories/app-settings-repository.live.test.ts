import { renderHook, waitFor } from "@testing-library/react-native";
import { createTestDb } from "@/lib/db/test-db";
import type * as AppSettingsRepository from "./app-settings-repository";

/** `useAppSetting(key)` must follow a changed `key` — see `entry-repository.live.test.ts`. */
const mockDb = createTestDb();
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));
jest.doMock("drizzle-orm/expo-sqlite", () => ({
	useLiveQuery: require("@/lib/db/test-live-query").useLiveQuery,
}));

const {
	setSetting,
	useAppSetting,
}: typeof AppSettingsRepository = require("./app-settings-repository");

describe("useAppSetting", () => {
	it("re-queries when the key changes", async () => {
		await setSetting("first", "one");
		await setSetting("second", "two");

		const { result, rerender } = await renderHook(
			(key: string) => useAppSetting(key),
			{ initialProps: "first" },
		);
		await waitFor(() => expect(result.current).toBe("one"));

		await rerender("second");

		await waitFor(() => expect(result.current).toBe("two"));
	});
});
