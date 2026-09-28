import { act, renderHook, waitFor } from "@testing-library/react-native";

const mockGet = jest.fn();
const mockRequest = jest.fn();
jest.mock("./notifications", () => ({
	getNotificationPermission: () => mockGet(),
	requestNotificationPermission: () => mockRequest(),
}));

function load(): typeof import("./use-notification-permission") {
	let mod!: typeof import("./use-notification-permission");
	// Fresh module-level permission state per test, but the same React the
	// renderer uses (see frozen-day-repository.web.test.ts).
	const react = jest.requireActual("react");
	jest.isolateModules(() => {
		jest.doMock("react", () => react);
		mod = require("./use-notification-permission");
	});
	return mod;
}

describe("notification permission", () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockRequest.mockReset();
	});

	it("reads the current permission on mount", async () => {
		mockGet.mockResolvedValue("denied");
		const { useNotificationPermission } = load();
		const { result } = await renderHook(() => useNotificationPermission());
		await waitFor(() => expect(result.current).toBe("denied"));
	});

	it("prompts only when undetermined, and pushes the answer to live readers", async () => {
		mockGet.mockResolvedValue("undetermined");
		mockRequest.mockResolvedValue("granted");
		const { ensureNotificationPermission, useNotificationPermission } = load();
		const { result } = await renderHook(() => useNotificationPermission());
		await waitFor(() => expect(result.current).toBe("undetermined"));

		await act(async () => {
			await expect(ensureNotificationPermission()).resolves.toBe("granted");
		});

		expect(mockRequest).toHaveBeenCalledTimes(1);
		expect(result.current).toBe("granted");
	});

	it("never re-prompts after a denial", async () => {
		mockGet.mockResolvedValue("denied");
		const { ensureNotificationPermission } = load();

		await expect(ensureNotificationPermission()).resolves.toBe("denied");
		expect(mockRequest).not.toHaveBeenCalled();
	});
});
