import { render, screen } from "@testing-library/react-native";
import { PlaceholderTabScreen } from "./placeholder-tab-screen";

describe("PlaceholderTabScreen", () => {
	it("names the module that's coming soon", async () => {
		await render(<PlaceholderTabScreen moduleName="To-dos" />);
		expect(screen.getByText("To-dos coming soon.")).toBeTruthy();
	});
});
