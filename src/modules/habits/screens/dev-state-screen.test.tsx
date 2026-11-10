import { render, screen } from "@testing-library/react-native";
import { DevStateScreen } from "./dev-state-screen";

// The flag is inlined when the screen module loads, so this file is the
// production build (flag unset); the validation build is
// dev-state-screen.validation.test.tsx.
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
	Redirect: ({ href }: { href: string }) => {
		const { Text } = require("react-native");
		return <Text>redirect {href}</Text>;
	},
	useRouter: () => ({ replace: mockReplace }),
	useLocalSearchParams: () => ({
		route: "/(progress)/progress?fixtures=progress-v3",
		clock: "2026-09-24T09:00:00",
	}),
}));

const mockReplaceAllData = jest.fn(async (_state: unknown) => {});
jest.mock("../repositories/dev-state-repository", () => ({
	replaceAllData: (state: unknown) => mockReplaceAllData(state),
}));

describe("DevStateScreen in a production build", () => {
	it("sends the link to Today and loads nothing", async () => {
		expect(process.env.EXPO_PUBLIC_DEVICE_VALIDATION).toBeUndefined();
		await render(<DevStateScreen />);
		expect(screen.getByText("redirect /")).toBeTruthy();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(mockReplaceAllData).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it("never loaded the loader module", () => {
		let loaded = false;
		jest.isolateModules(() => {
			jest.doMock("../services/load-device-state", () => {
				loaded = true;
				return {};
			});
			require("./dev-state-screen");
		});
		expect(loaded).toBe(false);
	});
});
