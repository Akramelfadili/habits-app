import { act, renderHook } from "@testing-library/react-native";

type Removal = { data: { action: unknown } };
let mockPrevent = false;
let mockOnRemove: ((event: Removal) => void) | null = null;
const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
jest.mock("expo-router", () => ({
	useNavigation: () => ({ dispatch: mockDispatch, goBack: mockGoBack }),
	usePreventRemove: (prevent: boolean, callback: (event: Removal) => void) => {
		mockPrevent = prevent;
		mockOnRemove = callback;
	},
}));

import { useLeaveGuard } from "./use-leave-guard";

const leaving = async (action: unknown = { type: "POP" }) => {
	await act(async () => {
		if (mockPrevent) mockOnRemove?.({ data: { action } });
	});
	return mockPrevent;
};

beforeEach(() => {
	jest.clearAllMocks();
	mockPrevent = false;
	mockOnRemove = null;
});

describe("useLeaveGuard", () => {
	it("does not prevent the exit when there are no edits", async () => {
		await renderHook(() => useLeaveGuard(false));
		expect(mockPrevent).toBe(false);
	});

	it("prevents the exit with edits, raises the prompt, and keep drops it", async () => {
		const { result } = await renderHook(() => useLeaveGuard(true));
		expect(await leaving()).toBe(true);
		expect(result.current.prompting).toBe(true);
		await act(async () => result.current.keep());
		expect(result.current.prompting).toBe(false);
		expect(mockDispatch).not.toHaveBeenCalled();
		expect(mockPrevent).toBe(true);
	});

	it("leave stops guarding, then replays the very same action", async () => {
		const { result } = await renderHook(() => useLeaveGuard(true));
		const action = { type: "POP", source: "header" };
		await leaving(action);
		await act(async () => result.current.leave());
		expect(mockPrevent).toBe(false);
		expect(mockDispatch).toHaveBeenCalledWith(action);
		expect(result.current.prompting).toBe(false);
	});

	it("leaveWith runs the screen's own exit only once the guard is off", async () => {
		const { result } = await renderHook(() => useLeaveGuard(true));
		const exit = jest.fn(() => {
			expect(mockPrevent).toBe(false);
		});
		await act(async () => result.current.leaveWith(exit));
		expect(exit).toHaveBeenCalledTimes(1);
		expect(result.current.prompting).toBe(false);
	});

	it("goes back when Discard has no pending action", async () => {
		const { result } = await renderHook(() => useLeaveGuard(true));
		await act(async () => result.current.leave());
		expect(mockGoBack).toHaveBeenCalledTimes(1);
	});
});
