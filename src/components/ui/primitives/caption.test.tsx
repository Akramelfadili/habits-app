import { render, screen } from "@testing-library/react-native";
import { Caption } from "./caption";

describe("Caption", () => {
	it("renders its text", async () => {
		await render(<Caption>pre-fills Mon–Fri</Caption>);
		expect(screen.getByText("pre-fills Mon–Fri")).toBeTruthy();
	});
});

describe("Caption — error tone", () => {
	it("announces itself as an alert", async () => {
		await render(<Caption tone="error">Pick at least one day.</Caption>);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Pick at least one day.",
		);
	});
});
