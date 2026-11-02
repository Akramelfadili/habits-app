import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

const mockCopyDiagnostics = jest.fn();
jest.mock("@/lib/diagnostics/diagnostics", () => ({
	copyDiagnostics: () => mockCopyDiagnostics(),
}));

import { ErrorScreen } from "./error-screen";

beforeEach(() => jest.clearAllMocks());

function renderScreen(onRetry = jest.fn()) {
	return render(
		<ErrorScreen
			title="Something went wrong"
			message="Your habits are safe."
			onRetry={onRetry}
		/>,
	);
}

describe("ErrorScreen", () => {
	it("has its title as the one heading", async () => {
		await renderScreen();
		const headings = screen.getAllByRole("header");
		expect(headings).toHaveLength(1);
		expect(headings[0].props.children).toBe("Something went wrong");
	});

	it("says why it stopped in an error banner when it is given a reason, and not otherwise (SY4)", async () => {
		await render(
			<ErrorScreen
				title="Update didn't finish"
				message="Your habits are as they were."
				reason={{
					title: "The update stopped",
					message: "Nothing was changed.",
				}}
				onRetry={jest.fn()}
			/>,
		);
		expect(screen.getByText("The update stopped")).toBeTruthy();
		expect(screen.getByText("Nothing was changed.")).toBeTruthy();
		expect(screen.getByRole("alert")).toBeTruthy();
	});

	it("has no banner without a reason", async () => {
		await renderScreen();
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("shows the title and message", async () => {
		await renderScreen();
		expect(screen.getByText("Something went wrong")).toBeTruthy();
		expect(screen.getByText("Your habits are safe.")).toBeTruthy();
	});

	it("Try again calls the retry", async () => {
		const onRetry = jest.fn();
		await renderScreen(onRetry);
		await fireEvent.press(screen.getByText("Try again"));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it.each([
		["copied", "Diagnostics copied."],
		["shared", "Diagnostics ready to share."],
		["failed", "Couldn't copy diagnostics."],
	])("Copy diagnostics (%s) says so", async (result, message) => {
		mockCopyDiagnostics.mockResolvedValue(result);
		await renderScreen();
		expect(screen.queryByText(message)).toBeNull();

		await fireEvent.press(screen.getByText("Copy diagnostics"));

		expect(await screen.findByText(message)).toBeTruthy();
	});
});
