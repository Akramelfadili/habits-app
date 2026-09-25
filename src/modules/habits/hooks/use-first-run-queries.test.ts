import { renderHook } from "@testing-library/react-native";

let mockSetting: string | null | undefined = null;

jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	useAppSetting: () => mockSetting,
}));

import { FIRST_RUN_SUGGESTIONS } from "../constants";
import { useFirstRunQueries } from "./use-first-run-queries";

describe("useFirstRunQueries", () => {
	it("exposes the 6 fixed suggestions", async () => {
		const { result } = await renderHook(() => useFirstRunQueries());
		expect(result.current.suggestions).toEqual(FIRST_RUN_SUGGESTIONS);
		expect(result.current.suggestions).toHaveLength(6);
	});

	it("reports not seen once resolved and genuinely unset", async () => {
		mockSetting = null;
		const { result } = await renderHook(() => useFirstRunQueries());
		expect(result.current.hasSeenFirstRun).toBe(false);
	});

	it("reports seen once the setting is set", async () => {
		mockSetting = "true";
		const { result } = await renderHook(() => useFirstRunQueries());
		expect(result.current.hasSeenFirstRun).toBe(true);
	});

	it("reports seen while the live query is still loading, to avoid flashing First Run", async () => {
		mockSetting = undefined;
		const { result } = await renderHook(() => useFirstRunQueries());
		expect(result.current.hasSeenFirstRun).toBe(true);
	});
});
