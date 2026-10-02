import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { StyleSheet } from "react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return {
		SymbolView: (props: { name: string }) => (
			<View testID={`symbol-${props.name}`} />
		),
	};
});

import {
	HEADER_BUTTON_MIN_SIZE,
	headerActionOptions,
	headerBackOptions,
	headerNoBackOptions,
} from "./header-buttons";

const itemProps = { canGoBack: true, tintColor: "#000" } as never;

/** The iOS items — what actually reaches the native nav bar on iOS 26. */
function iosItems(
	options:
		| ReturnType<typeof headerBackOptions>
		| ReturnType<typeof headerActionOptions>,
) {
	const left = options.unstable_headerLeftItems?.(itemProps) ?? [];
	const right = options.unstable_headerRightItems?.(itemProps) ?? [];
	return [...left, ...right];
}

function onlyCustomElement(
	options:
		| ReturnType<typeof headerBackOptions>
		| ReturnType<typeof headerActionOptions>,
): ReactElement {
	const [item] = iosItems(options);
	if (item?.type !== "custom") throw new Error("expected one custom item");
	return item.element as ReactElement;
}

const size = () =>
	StyleSheet.flatten(
		screen.getByRole("button").props.style as Parameters<
			typeof StyleSheet.flatten
		>[0],
	);

describe("headerBackOptions", () => {
	it("hides the system back button and opts the item out of the iOS 26 glass", () => {
		const options = headerBackOptions({ title: "Today", onPress: jest.fn() });
		expect(options.headerBackVisible).toBe(false);
		const items = iosItems(options);
		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			type: "custom",
			hidesSharedBackground: true,
		});
	});

	it("keeps the previous screen's title as its text, with a chevron and an accessibility label", async () => {
		await render(
			onlyCustomElement(
				headerBackOptions({ title: "Today", onPress: jest.fn() }),
			),
		);
		expect(screen.getByText("Today")).toBeTruthy();
		expect(screen.getByTestId("symbol-chevron.left")).toBeTruthy();
		expect(screen.getByRole("button").props.accessibilityLabel).toBe(
			"Back to Today",
		);
	});

	it("still reads as Back when there's no title yet (a screen still loading)", async () => {
		await render(
			onlyCustomElement(headerBackOptions({ title: "", onPress: jest.fn() })),
		);
		expect(screen.getByRole("button").props.accessibilityLabel).toBe("Back");
	});

	it("fires the given back action — so goBack and any guard on it still run", async () => {
		const goBack = jest.fn();
		await render(
			onlyCustomElement(headerBackOptions({ title: "Today", onPress: goBack })),
		);
		await fireEvent.press(screen.getByRole("button"));
		expect(goBack).toHaveBeenCalledTimes(1);
	});

	it("keeps a 44pt tap target", async () => {
		await render(
			onlyCustomElement(
				headerBackOptions({ title: "Today", onPress: jest.fn() }),
			),
		);
		expect(size()).toMatchObject({
			minWidth: HEADER_BUTTON_MIN_SIZE,
			minHeight: HEADER_BUTTON_MIN_SIZE,
		});
		expect(HEADER_BUTTON_MIN_SIZE).toBeGreaterThanOrEqual(44);
	});

	it("gives web/Android the same button through headerLeft", async () => {
		const goBack = jest.fn();
		const HeaderLeft = headerBackOptions({
			title: "Today",
			onPress: goBack,
		}).headerLeft;
		if (!HeaderLeft) throw new Error("headerLeft was not set");
		await render(HeaderLeft(itemProps) as ReactElement);
		await fireEvent.press(screen.getByLabelText("Back to Today"));
		expect(goBack).toHaveBeenCalled();
	});
});

describe("headerActionOptions", () => {
	it("is a single glass-free trailing item", () => {
		const items = iosItems(
			headerActionOptions({ label: "Edit", onPress: jest.fn() }),
		);
		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			type: "custom",
			hidesSharedBackground: true,
		});
	});

	it("renders plain text, labelled for VoiceOver, 44pt, and fires its action", async () => {
		const onPress = jest.fn();
		await render(
			onlyCustomElement(headerActionOptions({ label: "Cancel", onPress })),
		);
		expect(screen.getByText("Cancel")).toBeTruthy();
		expect(screen.getByRole("button").props.accessibilityLabel).toBe("Cancel");
		expect(size()).toMatchObject({
			minWidth: HEADER_BUTTON_MIN_SIZE,
			minHeight: HEADER_BUTTON_MIN_SIZE,
		});
		await fireEvent.press(screen.getByRole("button"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("gives web/Android the same button through headerRight", async () => {
		const onPress = jest.fn();
		const HeaderRight = headerActionOptions({
			label: "Edit",
			onPress,
		}).headerRight;
		if (!HeaderRight) throw new Error("headerRight was not set");
		await render(HeaderRight(itemProps) as ReactElement);
		await fireEvent.press(screen.getByText("Edit"));
		expect(onPress).toHaveBeenCalled();
	});
});

describe("headerBackOptions — nothing to go back to", () => {
	it("shows no back button, like the system one, on a deep-linked first screen", () => {
		const options = headerBackOptions({ title: "Today", onPress: jest.fn() });
		const noHistory = { canGoBack: false, tintColor: "#000" } as never;
		expect(options.unstable_headerLeftItems?.(noHistory)).toEqual([]);
		expect(options.headerLeft?.(noHistory)).toBeNull();
	});
});

describe("headerNoBackOptions", () => {
	it("leaves no leading button at all — native or custom", () => {
		const options = headerNoBackOptions();
		expect(options.headerBackVisible).toBe(false);
		expect(options.headerLeft?.(itemProps)).toBeNull();
		expect(options.unstable_headerLeftItems?.(itemProps)).toEqual([]);
	});
});
