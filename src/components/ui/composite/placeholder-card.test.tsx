import { render, screen } from "@testing-library/react-native";
import { PlaceholderCard } from "./placeholder-card";

describe("PlaceholderCard", () => {
	it("shows a dashed card with a title and where to fill it, nothing pressable", async () => {
		await render(
			<PlaceholderCard title="Nothing archived" message="Archive from Edit." />,
		);
		expect(screen.getByText("Nothing archived")).toBeTruthy();
		expect(screen.getByText("Archive from Edit.")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.getByText("Nothing archived").parent).toHaveStyle({
			borderStyle: "dashed",
		});
	});
});
