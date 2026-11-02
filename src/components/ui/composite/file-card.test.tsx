import { render, screen } from "@testing-library/react-native";
import { FileCard } from "./file-card";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("FileCard", () => {
	it("shows the file name and its size line", async () => {
		await render(
			<FileCard
				name="habits-2026-09-16.csv"
				meta="214 KB · 9 habits · 1,284 entries"
			/>,
		);
		expect(screen.getByText("habits-2026-09-16.csv")).toBeTruthy();
		expect(screen.getByText("214 KB · 9 habits · 1,284 entries")).toBeTruthy();
	});

	it("reads as one line for VoiceOver", async () => {
		await render(<FileCard name="habits.json" meta="48 KB · 9 habits" />);
		expect(screen.getByLabelText("habits.json, 48 KB · 9 habits")).toBeTruthy();
	});
});
