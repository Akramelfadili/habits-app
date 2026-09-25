import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useAsyncAction } from "./use-async-action";

describe("useAsyncAction", () => {
	it("resolves with the action's result and tracks loading state", async () => {
		const action = jest.fn(async (value: number) => value * 2);
		const { result } = await renderHook(() => useAsyncAction(action));

		expect(result.current.isLoading).toBe(false);

		const returned = await act(() => result.current.execute(21));

		expect(returned).toBe(42);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("captures a thrown error and re-throws it", async () => {
		const action = jest.fn(async () => {
			throw new Error("boom");
		});
		const { result } = await renderHook(() => useAsyncAction(action));

		await act(async () => {
			await expect(result.current.execute()).rejects.toThrow("boom");
		});

		await waitFor(() => expect(result.current.error?.message).toBe("boom"));
		expect(result.current.isLoading).toBe(false);
	});
});
