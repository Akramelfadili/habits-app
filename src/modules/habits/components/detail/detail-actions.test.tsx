import { fireEvent, render, screen } from "@testing-library/react-native";
import { semanticColors } from "@/theme/theme";
import { DetailActions } from "./detail-actions";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("DetailActions", () => {
	it("offers Archive habit with what it does, then Delete habit last", async () => {
		const onArchive = jest.fn();
		const onDelete = jest.fn();
		await render(
			<DetailActions canArchive onArchive={onArchive} onDelete={onDelete} />,
		);
		const order = screen
			.getAllByText(/^(Archive habit|Delete habit)$/)
			.map((node) => node.props.children);
		expect(order).toEqual(["Archive habit", "Delete habit"]);
		expect(screen.getByText("Hide from Today, keep history")).toBeTruthy();

		await fireEvent.press(
			screen.getByRole("button", { name: /^Archive habit/ }),
		);
		await fireEvent.press(
			screen.getByRole("button", { name: /^Delete habit/ }),
		);
		expect(onArchive).toHaveBeenCalledTimes(1);
		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it("Delete reads in the danger ink, and in words", async () => {
		await render(
			<DetailActions canArchive onArchive={jest.fn()} onDelete={jest.fn()} />,
		);
		expect(screen.getByText("Delete habit")).toHaveStyle({
			color: semanticColors.light.dangerBg,
		});
	});

	it("an archived habit has only Delete", async () => {
		await render(
			<DetailActions
				canArchive={false}
				onArchive={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.queryByText("Archive habit")).toBeNull();
		expect(screen.getByText("Delete habit")).toBeTruthy();
	});
});
