import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { ListItem } from "./list-item";

describe("ListItem", () => {
	it("renders title and subtitle", async () => {
		await render(<ListItem title="Gym" subtitle="Morning" />);
		expect(screen.getByText("Gym")).toBeTruthy();
		expect(screen.getByText("Morning")).toBeTruthy();
	});

	it("renders without a subtitle when none is passed", async () => {
		await render(<ListItem title="Gym" />);
		expect(screen.queryByText("Morning")).toBeNull();
	});

	it("calls onPress when tapped", async () => {
		const onPress = jest.fn();
		await render(<ListItem title="Gym" onPress={onPress} />);

		await fireEvent.press(screen.getByText("Gym"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("renders a trailing control", async () => {
		const { Text } = require("react-native");
		await render(<ListItem title="Direction" trailing={<Text>Build</Text>} />);
		expect(screen.getByText("Build")).toBeTruthy();
	});
});
