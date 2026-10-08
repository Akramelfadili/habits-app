import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
}));

type Row = { subline: string; disabledReason?: string };
let mockMenu: Record<
	"weekly" | "monthly" | "yearly" | "manage" | "settings",
	Row
>;
jest.mock("../hooks/use-today-menu-queries", () => ({
	useTodayMenuQueries: () => mockMenu,
}));

import { TodayNavMenu } from "./today-nav-menu";

beforeEach(() => {
	mockPush.mockReset();
	mockMenu = {
		weekly: { subline: "6 of 7 days" },
		monthly: { subline: "September" },
		yearly: { subline: "2026 so far" },
		manage: { subline: "3 active · 1 archived" },
		settings: { subline: "Last export · Never" },
	};
});

describe("TodayNavMenu", () => {
	it("lists the five destinations with their live sublines", async () => {
		await render(<TodayNavMenu anchorBottom={100} onClose={jest.fn()} />);

		expect(screen.getByText("SUMMARIES")).toBeTruthy();
		expect(screen.getByLabelText("Weekly summary, 6 of 7 days")).toBeTruthy();
		expect(screen.getByLabelText("Monthly, September")).toBeTruthy();
		expect(screen.getByLabelText("Yearly, 2026 so far")).toBeTruthy();
		expect(
			screen.getByLabelText("Manage & archive, 3 active · 1 archived"),
		).toBeTruthy();
		expect(screen.getByLabelText("Settings, Last export · Never")).toBeTruthy();
	});

	it.each([
		["Weekly summary, 6 of 7 days", "/habits/week"],
		["Monthly, September", "/habits/month"],
		["Yearly, 2026 so far", "/habits/year"],
		["Manage & archive, 3 active · 1 archived", "/habits/manage"],
		["Settings, Last export · Never", "/habits/settings"],
	])("%s closes the menu, then navigates to %s", async (label, href) => {
		const onClose = jest.fn();
		await render(<TodayNavMenu anchorBottom={100} onClose={onClose} />);

		await fireEvent.press(screen.getByLabelText(label));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(mockPush).toHaveBeenCalledWith(href);
	});

	it("shows a disabled row's reason in place of its subline and ignores taps", async () => {
		mockMenu.weekly = {
			subline: "",
			disabledReason: "After your first full week",
		};
		await render(<TodayNavMenu anchorBottom={100} onClose={jest.fn()} />);

		const row = screen.getByLabelText(
			"Weekly summary, After your first full week",
		);
		await fireEvent.press(row);

		expect(mockPush).not.toHaveBeenCalled();
	});

	it("closes from the scrim", async () => {
		const onClose = jest.fn();
		await render(<TodayNavMenu anchorBottom={100} onClose={onClose} />);

		await fireEvent.press(screen.getByLabelText("Close menu"));

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
