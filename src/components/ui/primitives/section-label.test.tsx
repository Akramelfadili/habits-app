import { render, screen } from "@testing-library/react-native";
import { SectionLabel } from "./section-label";

describe("SectionLabel", () => {
	it("renders its text uppercased", async () => {
		await render(<SectionLabel>Icon & color</SectionLabel>);
		expect(screen.getByText("ICON & COLOR")).toBeTruthy();
	});
});
