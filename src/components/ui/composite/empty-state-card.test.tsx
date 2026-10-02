import { fireEvent, render, screen } from "@testing-library/react-native";
import { EmptyStateCard } from "./empty-state-card";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("EmptyStateCard", () => {
	it("says what's empty and why, with the one action to fix it", async () => {
		const onAction = jest.fn();
		await render(
			<EmptyStateCard
				title="No active habits"
				message="Everything is archived."
				actionLabel="Add habit"
				onAction={onAction}
			/>,
		);
		expect(screen.getByText("No active habits")).toBeTruthy();
		expect(screen.getByText("Everything is archived.")).toBeTruthy();
		await fireEvent.press(screen.getByText("Add habit"));
		expect(onAction).toHaveBeenCalledTimes(1);
	});
});
