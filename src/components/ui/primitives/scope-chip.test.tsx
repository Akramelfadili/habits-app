import { render, screen } from "@testing-library/react-native";
import { ScopeChip } from "./scope-chip";

describe("ScopeChip", () => {
	it("shows what the setting applies to", async () => {
		await render(<ScopeChip label="All habits" />);
		expect(screen.getByText("All habits")).toBeTruthy();
	});
});
