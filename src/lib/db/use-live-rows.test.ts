import { renderHook } from "@testing-library/react-native";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { useLiveRows } from "./use-live-rows";

type Result = { data: unknown[]; error?: unknown; updatedAt?: Date };

let mockResult: Result = { data: [] };
jest.mock("drizzle-orm/expo-sqlite", () => ({
	useLiveQuery: () => mockResult,
}));

const query = {} as never;
const T1 = new Date(1000);
const T2 = new Date(2000);

beforeEach(() => {
	mockResult = { data: [] };
	clearLog();
});

describe("useLiveRows", () => {
	it("is not loaded until the first result, then loaded", async () => {
		const { result, rerender } = await renderHook(() => useLiveRows(query));
		expect(result.current).toEqual({ data: [], loaded: false });

		mockResult = { data: [{ id: 1 }], updatedAt: T1 };
		await rerender({});
		expect(result.current).toEqual({ data: [{ id: 1 }], loaded: true });
	});

	it("an empty first result is loaded — empty, not loading", async () => {
		mockResult = { data: [], updatedAt: T1 };
		const { result } = await renderHook(() => useLiveRows(query));
		expect(result.current.loaded).toBe(true);
	});

	it("stays loaded and keeps its rows when deps change (week navigation, day rollover)", async () => {
		mockResult = { data: [{ id: 1 }], updatedAt: T1 };
		const { result, rerender } = await renderHook(
			(week: string) => useLiveRows(query, [week]),
			{ initialProps: "w1" },
		);
		expect(result.current.loaded).toBe(true);

		// The new range's query is still running: Drizzle keeps the old state.
		await rerender("w2");
		expect(result.current).toEqual({ data: [{ id: 1 }], loaded: true });

		mockResult = { data: [{ id: 2 }], updatedAt: T2 };
		await rerender("w2");
		expect(result.current.data).toEqual([{ id: 2 }]);
	});

	it("resetOnDepsChange: a different entity is not loaded until its own result", async () => {
		mockResult = { data: [{ habitId: 1 }], updatedAt: T1 };
		const { result, rerender } = await renderHook(
			(habitId: number) =>
				useLiveRows(query, [habitId], { resetOnDepsChange: true }),
			{ initialProps: 1 },
		);
		expect(result.current).toEqual({ data: [{ habitId: 1 }], loaded: true });

		await rerender(2);
		expect(result.current).toEqual({ data: [], loaded: false });

		mockResult = { data: [{ habitId: 2 }], updatedAt: T2 };
		await rerender(2);
		expect(result.current).toEqual({ data: [{ habitId: 2 }], loaded: true });
	});

	it("logs a query error once and throws it to the boundary", async () => {
		mockResult = { data: [], error: new Error("no such table") };
		await expect(renderHook(() => useLiveRows(query))).rejects.toThrow(
			"no such table",
		);
		const errors = getLogEntries().filter((entry) => entry.level === "error");
		expect(errors).toHaveLength(1);
		expect(errors[0].event).toBe("livequery.failed");
	});
});
