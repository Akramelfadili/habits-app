import { render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: (props: object) => <View testID="symbol" {...props} /> };
});

import { IconBadge } from "./icon-badge";

describe("IconBadge", () => {
	it("tints the glyph with the accent ink when an accent is given", async () => {
		await render(
			<IconBadge symbol="book.fill" accent={{ tint: "#EEF", ink: "#00F" }} />,
		);
		expect(screen.getByTestId("symbol").props.tintColor).toBe("#00F");
	});

	it("falls back to a neutral glyph without an accent", async () => {
		await render(<IconBadge symbol="tag" />);
		expect(screen.getByTestId("symbol").props.tintColor).not.toBe("#00F");
		expect(screen.getByTestId("symbol").props.name).toBe("tag");
	});
});

describe("IconBadge — small (VAR-02)", () => {
	it("draws the 22px inline badge", async () => {
		await render(<IconBadge size="small" symbol="line.3.horizontal" />);
		expect(screen.getByTestId("symbol").props.size).toBe(11);
		expect(screen.toJSON()).toHaveStyle({ width: 22, height: 22 });
	});
});
