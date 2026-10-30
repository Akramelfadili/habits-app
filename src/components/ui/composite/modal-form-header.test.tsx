import {
	fireEvent,
	render,
	renderHook,
	screen,
} from "@testing-library/react-native";
import type { ReactElement } from "react";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ back: mockBack }),
}));

import { useModalFormHeaderOptions } from "./modal-form-header";

describe("useModalFormHeaderOptions", () => {
	beforeEach(() => {
		mockBack.mockReset();
	});

	it("sets the given title and suppresses the back button", async () => {
		const { result } = await renderHook(() =>
			useModalFormHeaderOptions("New habit"),
		);

		expect(result.current.title).toBe("New habit");
		expect(result.current.presentation).toBe("fullScreenModal");
		expect(result.current.headerBackVisible).toBe(false);
		expect(result.current.headerLeft?.({} as never)).toBeNull();
		expect(result.current.unstable_headerLeftItems?.({} as never)).toEqual([]);
	});

	it("dismisses the form through Close on iOS — the glass-free nav-bar item", async () => {
		const { result } = await renderHook(() =>
			useModalFormHeaderOptions("Edit habit"),
		);
		const [item] =
			result.current.unstable_headerRightItems?.({
				canGoBack: true,
				tintColor: "#000",
			} as never) ?? [];
		if (item?.type !== "custom") throw new Error("expected a custom item");
		expect(item.hidesSharedBackground).toBe(true);

		await render(item.element as ReactElement);
		await fireEvent.press(screen.getByText("Close"));
		expect(mockBack).toHaveBeenCalledTimes(1);
	});

	it("dismisses the form through Close on web/Android too", async () => {
		const { result } = await renderHook(() =>
			useModalFormHeaderOptions("Edit habit"),
		);
		const HeaderRight = result.current.headerRight;
		if (!HeaderRight) throw new Error("headerRight was not set");

		await render(<HeaderRight canGoBack tintColor="#000" />);
		await fireEvent.press(screen.getByText("Close"));
		expect(mockBack).toHaveBeenCalledTimes(1);
	});
});
