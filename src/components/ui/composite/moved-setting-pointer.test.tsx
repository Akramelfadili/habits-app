import { fireEvent, render, screen } from "@testing-library/react-native";
import { MovedSettingPointer } from "./moved-setting-pointer";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("MovedSettingPointer", () => {
	it("shows the copy and calls onPress from the link", async () => {
		const onPress = jest.fn();
		await render(
			<MovedSettingPointer
				body="It now lives in Settings."
				linkLabel="Open Settings →"
				onPress={onPress}
			/>,
		);
		expect(screen.getByText("It now lives in Settings.")).toBeTruthy();
		await fireEvent.press(
			screen.getByRole("link", { name: "Open Settings →" }),
		);
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("dims the link while pressed", async () => {
		await render(
			<MovedSettingPointer body="Body" linkLabel="Go →" onPress={jest.fn()} />,
		);
		const link = screen.getByRole("link", { name: "Go →" });
		expect(link.props.style).toBeFalsy();
		await fireEvent(link, "responderGrant", {
			nativeEvent: { touches: [], changedTouches: [] },
			touchHistory: { touchBank: [] },
			persist: jest.fn(),
			timeStamp: 0,
		});
		expect(screen.getByRole("link", { name: "Go →" }).props.style).toEqual(
			expect.objectContaining({ opacity: expect.any(Number) }),
		);
	});
});
