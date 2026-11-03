import { act, renderHook } from "@testing-library/react-native";
import { useTabRetapStore } from "@/store/tab-retap-store";
import { useOnTabRetap } from "./use-on-tab-retap";

describe("useOnTabRetap", () => {
	it("answers a re-tap of its own tab, not of another", async () => {
		const handler = jest.fn();
		await renderHook(() => useOnTabRetap("(today)", handler));
		await act(async () => useTabRetapStore.getState().retap("(habits)"));
		expect(handler).not.toHaveBeenCalled();
		await act(async () => useTabRetapStore.getState().retap("(today)"));
		await act(async () => useTabRetapStore.getState().retap("(today)"));
		expect(handler).toHaveBeenCalledTimes(2);
	});

	it("stops listening when the screen goes", async () => {
		const handler = jest.fn();
		const { unmount } = await renderHook(() =>
			useOnTabRetap("(progress)", handler),
		);
		await unmount();
		await act(async () => useTabRetapStore.getState().retap("(progress)"));
		expect(handler).not.toHaveBeenCalled();
	});
});
