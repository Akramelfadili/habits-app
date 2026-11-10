import { render, waitFor } from "@testing-library/react-native";

// The flag is inlined when the screen module loads, so it is set before the
// module is required. This file is the device-validation build.
process.env.EXPO_PUBLIC_DEVICE_VALIDATION = "1";

const mockReplace = jest.fn();
let mockNavigationKey: string | undefined = "root";

jest.mock("expo-router", () => ({
	Redirect: () => null,
	useRouter: () => ({ replace: mockReplace }),
	useRootNavigationState: () => ({ key: mockNavigationKey }),
	useLocalSearchParams: () => ({
		route: "/(progress)/progress?fixtures=progress-v3",
		clock: "2026-09-24T09:00:00",
	}),
}));

const mockReplaceAllData = jest.fn(async (_state: unknown) => {});
jest.mock("../repositories/dev-state-repository", () => ({
	replaceAllData: (state: unknown) => mockReplaceAllData(state),
}));
jest.mock("@/theme/theme-preference", () => ({
	loadThemePreference: jest.fn(async () => {}),
}));

let mockRequest: { route: string; clock?: string } | null = null;
jest.mock("@/lib/device-validation/launch-request", () => ({
	readLaunchRequest: () => mockRequest,
}));

const {
	DevStateScreen,
	DeviceValidationLaunch,
} = require("./dev-state-screen");

describe("DevStateScreen in the device-validation build", () => {
	afterAll(() => {
		delete process.env.EXPO_PUBLIC_DEVICE_VALIDATION;
	});
	beforeEach(() => {
		mockReplace.mockClear();
		mockReplaceAllData.mockClear();
		mockRequest = null;
		mockNavigationKey = "root";
	});

	it("loads the route's scenario, then opens the route", async () => {
		await render(<DevStateScreen />);
		await waitFor(() =>
			expect(mockReplace).toHaveBeenCalledWith(
				"/(progress)/progress?fixtures=progress-v3",
			),
		);
		expect(mockReplaceAllData).toHaveBeenCalledWith(
			expect.objectContaining({ scenario: "progress-v3" }),
		);
	});

	it("opens dev-state for a launch request once the navigator is ready", async () => {
		mockRequest = { route: "/?fixtures=empty", clock: "2026-09-24T09:00:00" };
		await render(<DeviceValidationLaunch />);
		await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
		expect(mockReplace.mock.calls[0][0]).toMatch(/^\/dev-state\?route=/);
	});

	it("waits for the navigator and ignores a missing request", async () => {
		mockNavigationKey = undefined;
		mockRequest = { route: "/" };
		await render(<DeviceValidationLaunch />);
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(mockReplace).not.toHaveBeenCalled();
	});
});
