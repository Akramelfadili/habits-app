import { act, renderHook, waitFor } from "@testing-library/react-native";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { useToastStore } from "@/store/toast-store";
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

	describe("run", () => {
		beforeEach(() => {
			clearLog();
			useToastStore.setState({ toast: null });
		});

		it("resolves ok and tracks loading", async () => {
			const { result } = await renderHook(() =>
				useAsyncAction(async (n: number) => n + 1, { scope: "t" }),
			);
			const returned = await act(() => result.current.run(1));
			expect(returned).toEqual({ ok: true, value: 2 });
			expect(result.current.isLoading).toBe(false);
		});

		it("never rejects: logs once, toasts the failure copy, releases loading", async () => {
			const action = jest.fn(async () => {
				throw new Error("boom");
			});
			const { result } = await renderHook(() =>
				useAsyncAction(action, {
					scope: "today",
					failure: "Couldn't update this habit. Try again.",
				}),
			);

			const returned = await act(() => result.current.run());

			expect(returned).toMatchObject({ ok: false });
			expect(useToastStore.getState().toast).toMatchObject({
				message: "Couldn't update this habit. Try again.",
				tone: "error",
			});
			expect(getLogEntries()).toHaveLength(1);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error?.message).toBe("boom");
		});
	});
});
