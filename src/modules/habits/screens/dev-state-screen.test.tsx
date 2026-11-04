import { render, screen, waitFor } from "@testing-library/react-native";
import { DevStateScreen } from "./dev-state-screen";

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
	Redirect: ({ href }: { href: string }) => {
		const { Text } = require("react-native");
		return <Text>redirect {href}</Text>;
	},
	useRouter: () => ({ replace: mockReplace }),
	useLocalSearchParams: () => mockParams,
}));

const mockLoad = jest.fn(async (_search: string) => {});
jest.mock("../services/load-device-state", () => ({
	loadDeviceState: (search: string) => mockLoad(search),
}));
jest.mock("@/theme/theme-preference", () => ({
	loadThemePreference: jest.fn(async () => {}),
}));

describe("DevStateScreen", () => {
	const original = process.env.EXPO_PUBLIC_DEVICE_VALIDATION;
	beforeEach(() => {
		mockReplace.mockClear();
		mockLoad.mockClear();
		mockParams = {
			route: "/(progress)/progress?fixtures=progress-v3",
			clock: "2026-09-24T09:00:00",
		};
	});
	afterEach(() => {
		if (original === undefined)
			delete process.env.EXPO_PUBLIC_DEVICE_VALIDATION;
		else process.env.EXPO_PUBLIC_DEVICE_VALIDATION = original;
	});

	it("sends a production build to Today and loads nothing", async () => {
		delete process.env.EXPO_PUBLIC_DEVICE_VALIDATION;
		await render(<DevStateScreen />);
		expect(screen.getByText("redirect /")).toBeTruthy();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(mockLoad).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it("on the validation build loads the route's scenario, then opens the route", async () => {
		process.env.EXPO_PUBLIC_DEVICE_VALIDATION = "1";
		await render(<DevStateScreen />);
		await waitFor(() =>
			expect(mockReplace).toHaveBeenCalledWith(
				"/(progress)/progress?fixtures=progress-v3",
			),
		);
		expect(mockLoad).toHaveBeenCalledWith("?fixtures=progress-v3");
	});
});
