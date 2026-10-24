import { fireEvent, render, screen } from "@testing-library/react-native";

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
