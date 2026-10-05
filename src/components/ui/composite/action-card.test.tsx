import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { ActionCard } from "./action-card";

function renderCard(
	overrides: Partial<React.ComponentProps<typeof ActionCard>> = {},
) {
	const props = {
		title: "Archive instead",
		subtitle: "Hides it from Today. Reversible any time.",
		symbol: "archivebox" as const,
		onPress: jest.fn(),
		...overrides,
	};
	return render(<ActionCard {...props} />).then(() => props);
}

describe("ActionCard", () => {
	it("is one button whose label reads the title and subtitle", async () => {
		await renderCard();
		const button = screen.getByRole("button", {
			name: "Archive instead. Hides it from Today. Reversible any time.",
		});
		expect(button).toBeTruthy();
		expect(screen.getAllByRole("button")).toHaveLength(1);
	});

	it("presses from anywhere on the card, including its subtitle", async () => {
		const props = await renderCard();
		await fireEvent.press(
			screen.getByText("Hides it from Today. Reversible any time."),
		);
		expect(props.onPress).toHaveBeenCalledTimes(1);
	});

	it("dims while pressed", async () => {
		await renderCard();
		const card = () => screen.getByTestId("action-card");
		expect(StyleSheet.flatten(card().props.style).opacity).toBeUndefined();
		await fireEvent(card(), "responderGrant", {
			nativeEvent: { touches: [], changedTouches: [] },
			touchHistory: { touchBank: [] },
			persist: jest.fn(),
			timeStamp: 0,
		});
		expect(StyleSheet.flatten(card().props.style).opacity).toBeLessThan(1);
	});

	it("disabled: inert, faded and announced as disabled", async () => {
		const props = await renderCard({ disabled: true });
		const card = screen.getByTestId("action-card");
		await fireEvent.press(card);
		expect(props.onPress).not.toHaveBeenCalled();
		expect(card).toBeDisabled();
		expect(StyleSheet.flatten(card.props.style).opacity).toBeLessThan(1);
	});
});
