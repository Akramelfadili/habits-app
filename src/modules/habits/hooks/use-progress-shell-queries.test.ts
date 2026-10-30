import { renderHook } from "@testing-library/react-native";
import { useProgressShellQueries } from "./use-progress-shell-queries";

let mockHabits: unknown[] = [];
let mockLogged = { count: 0, firstDate: null, loaded: true };
let mockHabitsLoaded = true;
jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => ({ habits: mockHabits, loaded: mockHabitsLoaded }),
}));
jest.mock("../repositories/entry-repository", () => ({
	useLoggedDays: () => mockLogged,
}));

describe("useProgressShellQueries", () => {
	beforeEach(() => {
		mockHabits = [];
		mockLogged = { count: 0, firstDate: null, loaded: true };
		mockHabitsLoaded = true;
	});

	it("has nothing to export with no habits", async () => {
		const { result } = await renderHook(() => useProgressShellQueries());
		expect(result.current).toEqual(
			expect.objectContaining({
				loaded: true,
				hasHabits: false,
				hasLogs: false,
			}),
		);
	});

	it("has nothing to export with habits but no logs (P4)", async () => {
		mockHabits = [{ id: 1 }];
		const { result } = await renderHook(() => useProgressShellQueries());
		expect(result.current.hasHabits).toBe(true);
		expect(result.current.hasLogs).toBe(false);
	});

	it("can export once anything is logged", async () => {
		mockHabits = [{ id: 1 }];
		mockLogged = { count: 2, firstDate: null, loaded: true };
		const { result } = await renderHook(() => useProgressShellQueries());
		expect(result.current.hasLogs).toBe(true);
	});

	it("is not loaded until both reads have answered", async () => {
		mockHabitsLoaded = false;
		const { result } = await renderHook(() => useProgressShellQueries());
		expect(result.current.loaded).toBe(false);
		mockHabitsLoaded = true;
		mockLogged = { count: 0, firstDate: null, loaded: false };
		const second = await renderHook(() => useProgressShellQueries());
		expect(second.result.current.loaded).toBe(false);
	});
});
