import { renderHook } from "@testing-library/react-native";

let mockSetting: string | null | undefined = null;
let mockHabits: { loaded: boolean; habits: unknown[] } = {
	loaded: true,
	habits: [],
};

jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	useAppSetting: () => mockSetting,
}));
jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => mockHabits,
}));

import { useFirstRunQueries } from "./use-first-run-queries";

describe("useFirstRunQueries", () => {
	beforeEach(() => {
		mockSetting = null;
		mockHabits = { loaded: true, habits: [] };
	});

	it("opens first run with no habits and no flag", async () => {
		const { result } = await renderHook(() => useFirstRunQueries());
		expect(result.current).toEqual({ gate: "first-run", needsSeenMark: false });
	});

	it("waits while the habit list loads, so nothing flashes", async () => {
		mockHabits = { loaded: false, habits: [] };
		const { result } = await renderHook(() => useFirstRunQueries());
		expect(result.current.gate).toBe("loading");
	});

	it("waits while the flag is still being read", async () => {
		mockSetting = undefined;
		const { result } = await renderHook(() => useFirstRunQueries());
		expect(result.current.gate).toBe("loading");
	});

	it("never returns once the flag is set, whatever the habits", async () => {
		mockSetting = "true";
		const { result } = await renderHook(() => useFirstRunQueries());
		expect(result.current).toEqual({ gate: "done", needsSeenMark: false });
	});

	it("asks for the flag to be written when habits exist without it", async () => {
		mockHabits = { loaded: true, habits: [{}] };
		const { result } = await renderHook(() => useFirstRunQueries());
		expect(result.current).toEqual({ gate: "done", needsSeenMark: true });
	});
});
