import { renderHook } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import {
	getSetting,
	setSetting,
} from "@/lib/app-settings/repositories/app-settings-repository";
import { useHapticsStore } from "@/store/haptics-store";
import {
	loadHapticsSetting,
	setHapticsEnabled,
	useHaptics,
} from "./use-haptics";

jest.mock("expo-haptics", () => ({
	selectionAsync: jest.fn(async () => undefined),
	notificationAsync: jest.fn(async () => undefined),
	NotificationFeedbackType: { Success: "success", Warning: "warning" },
}));
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	getSetting: jest.fn(),
	setSetting: jest.fn(async () => undefined),
}));

describe("useHaptics", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useHapticsStore.setState({ enabled: true });
	});

	it("selection, success and warning map to the three feedback types", async () => {
		const { result } = await renderHook(() => useHaptics());
		result.current.selection();
		result.current.success();
		result.current.warning();
		expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
		expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(1, "success");
		expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(2, "warning");
	});

	it("does nothing while the setting is off", async () => {
		useHapticsStore.setState({ enabled: false });
		const { result } = await renderHook(() => useHaptics());
		result.current.selection();
		result.current.success();
		result.current.warning();
		expect(Haptics.selectionAsync).not.toHaveBeenCalled();
		expect(Haptics.notificationAsync).not.toHaveBeenCalled();
	});

	it("never throws when the haptic engine fails", async () => {
		(Haptics.selectionAsync as jest.Mock).mockRejectedValueOnce(new Error("x"));
		(Haptics.notificationAsync as jest.Mock).mockImplementationOnce(() => {
			throw new Error("y");
		});
		const { result } = await renderHook(() => useHaptics());
		expect(() => result.current.selection()).not.toThrow();
		expect(() => result.current.success()).not.toThrow();
	});

	it("returns the same object every render", async () => {
		const { result, rerender } = await renderHook(() => useHaptics());
		const first = result.current;
		await rerender({});
		expect(result.current).toBe(first);
	});
});

describe("haptics setting", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useHapticsStore.setState({ enabled: true });
	});

	it("is on when never set, off only for the stored 'false'", async () => {
		(getSetting as jest.Mock).mockResolvedValueOnce(null);
		await loadHapticsSetting();
		expect(useHapticsStore.getState().enabled).toBe(true);

		(getSetting as jest.Mock).mockResolvedValueOnce("false");
		await loadHapticsSetting();
		expect(useHapticsStore.getState().enabled).toBe(false);

		(getSetting as jest.Mock).mockResolvedValueOnce("true");
		await loadHapticsSetting();
		expect(useHapticsStore.getState().enabled).toBe(true);
	});

	it("an unreadable setting leaves haptics on", async () => {
		(getSetting as jest.Mock).mockRejectedValueOnce(new Error("db"));
		await loadHapticsSetting();
		expect(useHapticsStore.getState().enabled).toBe(true);
	});

	it("setting it applies at once and stores the value", async () => {
		await setHapticsEnabled(false);
		expect(useHapticsStore.getState().enabled).toBe(false);
		expect(setSetting).toHaveBeenCalledWith("app.haptics", "false");
	});
});
