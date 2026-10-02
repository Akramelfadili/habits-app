import { render, screen } from "@testing-library/react-native";
import { KeyValueRow } from "./key-value-row";

describe("KeyValueRow", () => {
	it("shows the label and its value", async () => {
		await render(<KeyValueRow label="Last export" value="Never" />);
		expect(screen.getByText("Last export")).toBeTruthy();
		expect(screen.getByText("Never")).toBeTruthy();
	});
});
