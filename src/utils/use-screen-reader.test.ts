import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useScreenReader } from "./use-screen-reader";

describe("useScreenReader", () => {
	let listener: (enabled: boolean) => void = () => {};
	const remove = jest.fn();

	beforeEach(() => {
		remove.mockClear();
		jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((
			_event: string,
			handler: (e: boolean) => void,
		) => {
			listener = handler;
			return { remove };
		}) as never);
	});

	afterEach(() => jest.restoreAllMocks());

	it("is false with no screen reader running", async () => {
		jest
			.spyOn(AccessibilityInfo, "isScreenReaderEnabled")
			.mockResolvedValue(false);
		const { result } = await renderHook(() => useScreenReader());
		await act(async () => {});
		expect(result.current).toBe(false);
	});

	it("is true when VoiceOver/TalkBack is on at launch, and follows it as it changes", async () => {
		jest
			.spyOn(AccessibilityInfo, "isScreenReaderEnabled")
			.mockResolvedValue(true);
		const { result, unmount } = await renderHook(() => useScreenReader());
		await act(async () => {});
		expect(result.current).toBe(true);

		await act(async () => listener(false));
		expect(result.current).toBe(false);

		await unmount();
		expect(remove).toHaveBeenCalled();
	});
});
