import {
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react-native";
import { surfaceColors } from "@/theme/theme";

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

	it("dims its content, but not the trailing control, when dimmed", async () => {
		const { Text } = require("react-native");
		await render(
			<ListItem title="Meditate" dimmed trailing={<Text>Check</Text>} />,
		);
		expect(screen.getByTestId("list-item-content")).toHaveStyle({
			opacity: 0.5,
		});
		expect(screen.getByText("Check")).not.toHaveStyle({ opacity: 0.5 });
	});

	it("is fully opaque by default", async () => {
		await render(<ListItem title="Meditate" />);
		expect(screen.getByTestId("list-item-content")).not.toHaveStyle({
			opacity: 0.5,
		});
	});

	it("runs a matching accessibility action", async () => {
		const onArchive = jest.fn();
		await render(
			<ListItem
				title="Meditate"
				onPress={() => {}}
				accessibilityActions={[{ label: "Archive", onAction: onArchive }]}
			/>,
		);

		await fireEvent(screen.getByRole("button"), "accessibilityAction", {
			nativeEvent: { actionName: "Archive" },
		});
		expect(onArchive).toHaveBeenCalledTimes(1);
	});

	it("keeps a trailing control outside the row's own button", async () => {
		const onRowPress = jest.fn();
		const onTrailingPress = jest.fn();
		const { Pressable, Text } = require("react-native");
		await render(
			<ListItem
				title="Cold shower"
				onPress={onRowPress}
				trailing={
					<Pressable accessibilityRole="button" onPress={onTrailingPress}>
						<Text>Restore</Text>
					</Pressable>
				}
			/>,
		);

		const [row] = screen.getAllByRole("button");
		expect(within(row).queryByText("Restore")).toBeNull();
		await fireEvent.press(screen.getByText("Restore"));
		expect(onTrailingPress).toHaveBeenCalledTimes(1);
		expect(onRowPress).not.toHaveBeenCalled();
	});

	it("shows the lifted state on the recessed surface", async () => {
		await render(<ListItem title="Meditate" lifted />);
		expect(screen.getByTestId("list-item")).toHaveStyle({
			backgroundColor: surfaceColors.light.inner,
		});
	});
});
