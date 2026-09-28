import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { semanticColors } from "@/theme/theme";
import { CompletionCircle } from "./completion-circle";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("CompletionCircle", () => {
	it("reports checked via accessibility when completed", async () => {
		await render(
			<CompletionCircle
				completed
				onPress={jest.fn()}
				accessibilityLabel="Glass of water"
			/>,
		);
		expect(
			screen.getByLabelText("Glass of water").props.accessibilityState,
		).toEqual({ checked: true });
	});

	it("reports unchecked via accessibility when not completed", async () => {
		await render(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="Glass of water"
			/>,
		);
		expect(
			screen.getByLabelText("Glass of water").props.accessibilityState,
		).toEqual({ checked: false });
	});

	it("calls onPress when tapped, regardless of state", async () => {
		const onPress = jest.fn();
		await render(
			<CompletionCircle
				completed={false}
				onPress={onPress}
				accessibilityLabel="Glass of water"
			/>,
		);
		await fireEvent.press(screen.getByLabelText("Glass of water"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("never fills solid for a Break habit, even when resisted", async () => {
		await render(
			<CompletionCircle
				completed
				onPress={jest.fn()}
				accessibilityLabel="No phone in bed"
				direction="break"
			/>,
		);
		const flatStyle = StyleSheet.flatten(
			screen.getByLabelText("No phone in bed").props.style,
		);
		expect(flatStyle.backgroundColor).toBeUndefined();
		expect(flatStyle.borderWidth).toBe(2);
	});

	it("uses a dashed ring for an empty Break habit", async () => {
		await render(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="No phone in bed"
				direction="break"
			/>,
		);
		const flatStyle = StyleSheet.flatten(
			screen.getByLabelText("No phone in bed").props.style,
		);
		expect(flatStyle.borderStyle).toBe("dashed");
	});

	it("reports checked for a resisted Break habit", async () => {
		await render(
			<CompletionCircle
				completed
				onPress={jest.fn()}
				accessibilityLabel="No phone in bed"
				direction="break"
			/>,
		);
		expect(
			screen.getByLabelText("No phone in bed").props.accessibilityState,
		).toEqual({ checked: true });
	});

	it("uses the plain empty style when not completed and progress is 0", async () => {
		await render(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="Glass of water"
				progress={0}
			/>,
		);
		const flatStyle = StyleSheet.flatten(
			screen.getByLabelText("Glass of water").props.style,
		);
		expect(flatStyle.borderWidth).toBe(2);
		expect(flatStyle.backgroundColor).toBeUndefined();
	});

	it("renders the partial pie-fill style when logged below target", async () => {
		await render(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="Glass of water"
				progress={0.6}
			/>,
		);
		const flatStyle = StyleSheet.flatten(
			screen.getByLabelText("Glass of water").props.style,
		);
		expect(flatStyle.backgroundColor).toBeDefined();
		expect(flatStyle.borderWidth).toBeUndefined();
	});

	it("shows the filled done style over partial once completed, regardless of progress", async () => {
		await render(
			<CompletionCircle
				completed
				onPress={jest.fn()}
				accessibilityLabel="Glass of water"
				progress={0.6}
			/>,
		);
		const flatStyle = StyleSheet.flatten(
			screen.getByLabelText("Glass of water").props.style,
		);
		expect(flatStyle.backgroundColor).toBeDefined();
		expect(
			screen.getByLabelText("Glass of water").props.accessibilityState,
		).toEqual({ checked: true });
	});

	it("shows the amber at-risk ring for a Break habit that's due for the prompt", async () => {
		await render(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="No phone in bed"
				direction="break"
				atRisk
			/>,
		);
		const flatStyle = StyleSheet.flatten(
			screen.getByLabelText("No phone in bed").props.style,
		);
		expect(flatStyle.borderStyle).not.toBe("dashed");
		expect(flatStyle.borderColor).toBe(semanticColors.light.warnInk);
	});

	it("ignores atRisk once the Break habit is resisted — the ink ring wins", async () => {
		await render(
			<CompletionCircle
				completed
				onPress={jest.fn()}
				accessibilityLabel="No phone in bed"
				direction="break"
				atRisk
			/>,
		);
		expect(
			screen.getByLabelText("No phone in bed").props.accessibilityState,
		).toEqual({ checked: true });
	});

	it("has no at-risk visual for a Build habit — none is documented", async () => {
		await render(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="Glass of water"
				direction="build"
				atRisk
			/>,
		);
		const flatStyle = StyleSheet.flatten(
			screen.getByLabelText("Glass of water").props.style,
		);
		expect(flatStyle.backgroundColor).toBeUndefined();
		expect(flatStyle.borderWidth).toBe(2);
	});

	it("uses a button role instead of checkbox when role is 'button'", async () => {
		await render(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="Log Glass of water"
				progress={0.6}
				role="button"
			/>,
		);
		expect(
			screen.getByRole("button", { name: "Log Glass of water" }),
		).toBeTruthy();
	});
});
