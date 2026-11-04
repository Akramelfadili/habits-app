import {
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { elevation, semanticColors, surfaceColors } from "@/theme/theme";

let mockAccessibilityText = false;
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => mockAccessibilityText,
}));

beforeEach(() => {
	mockAccessibilityText = false;
});

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { ListItem } from "./list-item";

describe("ListItem", () => {
	it("an embedded row keeps a 44 pt hit area (08.2)", async () => {
		await render(
			<ListItem embedded title="Set exact value" onPress={() => {}} />,
		);
		const style = StyleSheet.flatten(screen.getByRole("button").props.style);
		expect(style.minHeight).toBeGreaterThanOrEqual(44);
	});

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

	it("with keepLeading fades the text but leaves the leading icon opaque (H2)", async () => {
		await render(
			<ListItem
				title="Meditate"
				dimmed
				keepLeading
				leading={<Text>Icon</Text>}
			/>,
		);
		expect(screen.getByTestId("list-item-content")).not.toHaveStyle({
			opacity: 0.5,
		});
		expect(screen.getByText("Icon")).not.toHaveStyle({ opacity: 0.5 });
		expect(screen.getByText("Meditate").parent).toHaveStyle({ opacity: 0.5 });
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

	it("lifted: the E2 shadow on the card, so height reads in light", async () => {
		await render(<ListItem title="Meditate" lifted />);
		const row = StyleSheet.flatten(screen.getByTestId("list-item").props.style);
		expect(row.backgroundColor).toBe(surfaceColors.light.card);
		expect(row.boxShadow).toBe(elevation.light.lifted.boxShadow);
	});

	it("is a 60 pt row, with the 14 pt side padding of T-18", async () => {
		await render(<ListItem title="Drink water" onPress={jest.fn()} />);
		expect(
			StyleSheet.flatten(screen.getByRole("button").props.style),
		).toMatchObject({ minHeight: 60, paddingHorizontal: 14 });
	});

	it("destructive: the title reads in the danger ink, the subtitle does not", async () => {
		await render(
			<ListItem title="Delete habit" subtitle="Cannot be undone" destructive />,
		);
		expect(screen.getByText("Delete habit")).toHaveStyle({
			color: semanticColors.light.dangerBg,
		});
		expect(screen.getByText("Cannot be undone")).not.toHaveStyle({
			color: semanticColors.light.dangerBg,
		});
	});

	it("passes its hint to VoiceOver", async () => {
		await render(
			<ListItem
				title="Drink water"
				onPress={jest.fn()}
				accessibilityHint="Opens details."
			/>,
		);
		expect(screen.getByRole("button").props.accessibilityHint).toBe(
			"Opens details.",
		);
	});

	describe("long names and large text (A5-15)", () => {
		it("wraps a title to two lines then ends in an ellipsis, and keeps the subtitle to two", async () => {
			await render(
				<ListItem
					title="A habit name that goes on and on and on"
					subtitle="Training · every single day of the week"
				/>,
			);
			expect(
				screen.getByText("A habit name that goes on and on and on").props
					.numberOfLines,
			).toBe(2);
			expect(
				screen.getByText("Training · every single day of the week").props
					.numberOfLines,
			).toBe(2);
		});

		it("keeps a trailing value on one line and lets it shrink, so it can't push a control out", async () => {
			await render(
				<ListItem title="Reminders" value="3 on · 07:00, 12:30, 21:00" />,
			);
			const value = screen.getByText("3 on · 07:00, 12:30, 21:00");
			expect(value.props.numberOfLines).toBe(1);
			expect(StyleSheet.flatten(value.props.style)).toMatchObject({
				flexShrink: 1,
				maxWidth: "45%",
			});
		});

		it("lets a title beside an accessory shrink rather than crowd it out", async () => {
			await render(
				<ListItem
					title="A long title next to a scope chip"
					titleAccessory={<Text>All habits</Text>}
				/>,
			);
			expect(
				StyleSheet.flatten(
					screen.getByText("A long title next to a scope chip").props.style,
				).flexShrink,
			).toBe(1);
			expect(screen.getByText("All habits")).toBeTruthy();
		});

		it("keeps the whole name for a screen reader — truncation is visual only", async () => {
			await render(
				<ListItem
					title="A habit name that goes on and on and on"
					onPress={jest.fn()}
				/>,
			);
			expect(
				screen.getByRole("button", {
					name: "A habit name that goes on and on and on",
				}),
			).toBeTruthy();
		});
	});

	describe("accessibility text sizes (08.6)", () => {
		it("never truncates: the title and subtitle wrap freely and the row stacks", async () => {
			mockAccessibilityText = true;
			await render(
				<ListItem
					title="A habit name that goes on and on and on"
					subtitle="Training · every single day of the week"
					value="07:00"
					leading={<Text>icon</Text>}
				/>,
			);
			expect(
				screen.getByText("A habit name that goes on and on and on").props
					.numberOfLines,
			).toBeUndefined();
			expect(
				screen.getByText("Training · every single day of the week").props
					.numberOfLines,
			).toBeUndefined();
			expect(screen.getByText("07:00").props.numberOfLines).toBeUndefined();
			expect(
				StyleSheet.flatten(screen.getByTestId("list-item-content").props.style)
					.flexDirection,
			).toBe("column");
		});
	});

	it("selected makes it a radio: announced as picked or not, with a check only on the picked one", async () => {
		const { rerender } = await render(
			<ListItem title="Dark" selected={false} onPress={jest.fn()} />,
		);
		expect(screen.getByRole("radio").props.accessibilityState).toMatchObject({
			selected: false,
		});
		expect(screen.queryByTestId("list-item-check")).toBeNull();
		await rerender(<ListItem title="Dark" selected onPress={jest.fn()} />);
		expect(screen.getByTestId("list-item-check")).toBeTruthy();
		expect(screen.getByRole("radio").props.accessibilityState).toMatchObject({
			selected: true,
		});
	});
});
