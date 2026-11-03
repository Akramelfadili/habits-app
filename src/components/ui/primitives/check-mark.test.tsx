import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { CheckMark } from "./check-mark";

describe("CheckMark", () => {
	it("draws in the colour it is given", async () => {
		await render(<CheckMark color="#123456" />);
		expect(
			StyleSheet.flatten(screen.getByTestId("check-mark").props.style)
				.borderColor,
		).toBe("#123456");
	});
});
