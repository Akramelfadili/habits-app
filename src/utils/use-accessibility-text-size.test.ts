import { renderHook } from "@testing-library/react-native";
import { useWindowDimensions } from "react-native";
import {
	AX_FONT_SCALE,
	useAccessibilityTextSize,
} from "./use-accessibility-text-size";

jest.mock("react-native/Libraries/Utilities/useWindowDimensions");

async function atScale(fontScale: number) {
	jest
		.mocked(useWindowDimensions)
		.mockReturnValue({ width: 393, height: 852, scale: 3, fontScale });
	return await renderHook(() => useAccessibilityTextSize());
}

describe("useAccessibilityTextSize", () => {
	afterEach(() => jest.restoreAllMocks());

	it.each([0.82, 1, 1.12, 1.23, 1.35])(
		"is false at the standard size %p",
		async (fontScale) => {
			expect((await atScale(fontScale)).result.current).toBe(false);
		},
	);

	it.each([1.65, 1.94, 2.35, 3.12])(
		"is true at the accessibility size %p",
		async (fontScale) => {
			expect((await atScale(fontScale)).result.current).toBe(true);
		},
	);

	it("switches exactly at the threshold", async () => {
		expect((await atScale(AX_FONT_SCALE - 0.01)).result.current).toBe(false);
		expect((await atScale(AX_FONT_SCALE)).result.current).toBe(true);
	});
});
