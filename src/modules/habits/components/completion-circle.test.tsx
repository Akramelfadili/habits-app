import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { StyleSheet } from "react-native";
import { useHapticsStore } from "@/store/haptics-store";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { CompletionCircle } from "./completion-circle";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const light = { ...surfaceColors.light, ...semanticColors.light };

jest.mock("expo-haptics", () => ({
	selectionAsync: jest.fn(async () => undefined),
	notificationAsync: jest.fn(async () => undefined),
	NotificationFeedbackType: { Success: "success", Warning: "warning" },
}));

describe("CompletionCircle haptics", () => {
	beforeEach(() => {
		(Haptics.selectionAsync as jest.Mock).mockClear();
		useHapticsStore.setState({ enabled: true });
	});

	it("ticks once on a tap, and still calls onPress", async () => {
		const onPress = jest.fn();
		await render(
			<CompletionCircle
				completed={false}
				onPress={onPress}
				accessibilityLabel="Water"
			/>,
		);
		await fireEvent.press(screen.getByLabelText("Water"));
		expect(onPress).toHaveBeenCalledTimes(1);
		expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
	});

	it("is silent with the Haptics setting off, and the tap still works", async () => {
		useHapticsStore.setState({ enabled: false });
		const onPress = jest.fn();
		await render(
			<CompletionCircle
				completed={false}
				onPress={onPress}
				accessibilityLabel="Water"
			/>,
		);
		await fireEvent.press(screen.getByLabelText("Water"));
		expect(onPress).toHaveBeenCalledTimes(1);
		expect(Haptics.selectionAsync).not.toHaveBeenCalled();
	});
});

function face() {
	return StyleSheet.flatten(
		screen.getByTestId("completion-circle-face").props.style,
	);
}

describe("CompletionCircle", () => {
	it("reports checked or unchecked to accessibility", async () => {
		const { rerender } = await render(
			<CompletionCircle
				completed
				onPress={jest.fn()}
				accessibilityLabel="Water"
			/>,
		);
		expect(screen.getByLabelText("Water").props.accessibilityState).toEqual({
			checked: true,
			disabled: false,
		});
		await rerender(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="Water"
			/>,
		);
		expect(screen.getByLabelText("Water").props.accessibilityState).toEqual({
			checked: false,
			disabled: false,
		});
	});

	it("calls onPress and onLongPress", async () => {
		const onPress = jest.fn();
		const onLongPress = jest.fn();
		await render(
			<CompletionCircle
				completed={false}
				onPress={onPress}
				onLongPress={onLongPress}
				accessibilityLabel="Water"
			/>,
		);
		await fireEvent.press(screen.getByLabelText("Water"));
		await fireEvent(screen.getByLabelText("Water"), "longPress");
		expect(onPress).toHaveBeenCalledTimes(1);
		expect(onLongPress).toHaveBeenCalledTimes(1);
	});

	it("draws 28 pt inside a 44 pt hit area", async () => {
		await render(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="Water"
			/>,
		);
		const hit = StyleSheet.flatten(screen.getByLabelText("Water").props.style);
		expect([hit.width, hit.height]).toEqual([44, 44]);
		expect([face().width, face().height]).toEqual([28, 28]);
	});

	it("fills a done Build habit with the accent", async () => {
		await render(
			<CompletionCircle
				completed
				onPress={jest.fn()}
				accessibilityLabel="Read"
			/>,
		);
		expect(face().backgroundColor).toBe(light.accent);
	});

	it("outlines an empty Break habit in amber, solid", async () => {
		await render(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="No phone"
				direction="break"
			/>,
		);
		expect(face().borderColor).toBe(light.warnInk);
		expect(face().borderStyle).toBe("solid");
		expect(face().backgroundColor).toBeUndefined();
	});

	it("shows a resisted Break habit as an amber check on warnTint, never accent-filled", async () => {
		await render(
			<CompletionCircle
				completed
				onPress={jest.fn()}
				accessibilityLabel="No phone"
				direction="break"
			/>,
		);
		expect(face().backgroundColor).toBe(light.warnTint);
		expect(face().borderColor).toBe(light.warnInk);
	});

	it("shows a pie over the track for a partial quantity, and nothing once done", async () => {
		const { rerender } = await render(
			<CompletionCircle
				completed={false}
				progress={0.5}
				role="button"
				onPress={jest.fn()}
				accessibilityLabel="Water"
			/>,
		);
		expect(face().backgroundColor).toBe(light.track);
		await rerender(
			<CompletionCircle
				completed
				progress={0.5}
				role="button"
				onPress={jest.fn()}
				accessibilityLabel="Water"
			/>,
		);
		expect(face().backgroundColor).toBe(light.accent);
	});

	it("puts an amber dot on an at-risk circle but still logs", async () => {
		const onPress = jest.fn();
		await render(
			<CompletionCircle
				completed={false}
				atRisk
				onPress={onPress}
				accessibilityLabel="Meditate"
			/>,
		);
		expect(screen.getByTestId("completion-circle-at-risk")).toBeTruthy();
		await fireEvent.press(screen.getByLabelText("Meditate"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("draws a frozen day violet and dashed, and a not-due day dashed", async () => {
		const { rerender } = await render(
			<CompletionCircle
				completed={false}
				frozen
				onPress={jest.fn()}
				accessibilityLabel="Read"
			/>,
		);
		expect(face().borderColor).toBe(light.frozenInk);
		expect(face().borderStyle).toBe("dashed");
		await rerender(
			<CompletionCircle
				completed={false}
				notDue
				onPress={jest.fn()}
				accessibilityLabel="Read"
			/>,
		);
		expect(face().borderStyle).toBe("dashed");
		expect(face().borderColor).toBe(light.outline);
	});

	it("passes the hint to VoiceOver", async () => {
		await render(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="Water"
				accessibilityHint="Double-tap to log one more"
			/>,
		);
		expect(screen.getByLabelText("Water").props.accessibilityHint).toBe(
			"Double-tap to log one more",
		);
	});
});
