import {
	fireEvent,
	render,
	renderHook,
	screen,
} from "@testing-library/react-native";

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
	});

	it("renders a Cancel button in headerRight that navigates back", async () => {
		const { result } = await renderHook(() =>
			useModalFormHeaderOptions("Edit habit"),
		);
		const HeaderRight = result.current.headerRight;
		if (!HeaderRight) throw new Error("headerRight was not set");

		await render(<HeaderRight canGoBack tintColor="#000" />);
		await fireEvent.press(screen.getByText("Cancel"));
		expect(mockBack).toHaveBeenCalledTimes(1);
	});
});
