import { act, renderHook } from "@testing-library/react-native";

const mockSetSetting = jest.fn();

jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	setSetting: (...args: unknown[]) => mockSetSetting(...args),
}));

import { SEEN_FIRST_RUN_SETTING_KEY } from "../constants";
import { useFirstRunActions } from "./use-first-run-actions";

describe("useFirstRunActions", () => {
	beforeEach(() => {
		mockSetSetting.mockReset();
	});

	it("writes the seen flag and resolves ok", async () => {
		mockSetSetting.mockResolvedValue(undefined);
		const { result } = await renderHook(() => useFirstRunActions());

		let outcome: { ok: boolean } | undefined;
		await act(async () => {
			outcome = await result.current.markFirstRunSeen();
		});

		expect(mockSetSetting).toHaveBeenCalledWith(
			SEEN_FIRST_RUN_SETTING_KEY,
			"true",
		);
		expect(outcome?.ok).toBe(true);
		expect(result.current.isMarking).toBe(false);
	});

	it("resolves not-ok and keeps the error when the write fails, so the caller stays put", async () => {
		mockSetSetting.mockRejectedValue(new Error("disk full"));
		const { result } = await renderHook(() => useFirstRunActions());

		let outcome: { ok: boolean } | undefined;
		await act(async () => {
			outcome = await result.current.markFirstRunSeen();
		});

		expect(outcome?.ok).toBe(false);
		expect(result.current.markError).toBeInstanceOf(Error);
	});
});
