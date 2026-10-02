import { render, screen } from "@testing-library/react-native";
import { DragHandle } from "./drag-handle";

describe("DragHandle", () => {
	it("renders the grip", async () => {
		await render(<DragHandle />);
		expect(screen.getByTestId("drag-handle")).toBeTruthy();
	});
});
