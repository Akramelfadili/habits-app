import {
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));
let mockResult: "copied" | "shared" | "failed" = "copied";
jest.mock("@/lib/diagnostics/diagnostics", () => ({
	copyDiagnostics: async () => mockResult,
}));

import { TodayLoadError } from "./today-load-error";

const day = new Date(2026, 9, 23);

beforeEach(() => {
	mockResult = "copied";
	useToastStore.setState({ toast: null } as never);
});

describe("TodayLoadError (SY2)", () => {
	it("keeps Today's own header, with the date, and says the data is safe", async () => {
		await render(
			<TodayLoadError day={day} onRetry={jest.fn()} onAddHabit={jest.fn()} />,
		);
		expect(screen.getByText("FRIDAY, 23 OCTOBER")).toBeTruthy();
		expect(screen.getByText("Today")).toBeTruthy();
		expect(screen.getByText("Couldn’t load your habits")).toBeTruthy();
		expect(
			screen.getByText("Your data is safe. Trying again usually fixes this."),
		).toBeTruthy();
	});

	it("Try again calls the retry", async () => {
		const onRetry = jest.fn();
		await render(
			<TodayLoadError day={day} onRetry={onRetry} onAddHabit={jest.fn()} />,
		);
		await fireEvent.press(screen.getByText("Try again"));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("Copy diagnostics copies and says so in the one toast (the tab bar's host is still there)", async () => {
		await render(
			<TodayLoadError day={day} onRetry={jest.fn()} onAddHabit={jest.fn()} />,
		);
		await fireEvent.press(screen.getByText("Copy diagnostics"));
		await waitFor(() =>
			expect(useToastStore.getState().toast?.message).toBe(
				"Diagnostics copied",
			),
		);
	});

	it("the + still adds a habit", async () => {
		const onAddHabit = jest.fn();
		await render(
			<TodayLoadError day={day} onRetry={jest.fn()} onAddHabit={onAddHabit} />,
		);
		await fireEvent.press(screen.getByLabelText("Add habit"));
		expect(onAddHabit).toHaveBeenCalledTimes(1);
	});

	it("the heading names Today and the title says what failed", async () => {
		await render(
			<TodayLoadError day={day} onRetry={jest.fn()} onAddHabit={jest.fn()} />,
		);
		expect(
			screen.getByRole("header", { name: /^Today, Friday 23 October/ }),
		).toBeTruthy();
		expect(
			screen.getByRole("header", { name: "Couldn’t load your habits" }),
		).toBeTruthy();
	});
});
