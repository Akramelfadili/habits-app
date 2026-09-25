import { render, screen } from "@testing-library/react-native";
import { SectionHeader } from "./section-header";

describe("SectionHeader", () => {
	it("renders the title in its original case, not uppercased", async () => {
		await render(<SectionHeader title="Morning" />);
		expect(screen.getByText("Morning")).toBeTruthy();
	});

	it("renders the trailing count when given one", async () => {
		await render(<SectionHeader title="Morning" count="2/3" />);
		expect(screen.getByText("2/3")).toBeTruthy();
	});

	it("omits the count when none is given", async () => {
		await render(<SectionHeader title="Anytime" />);
		expect(screen.queryByText(/\//)).toBeNull();
	});
});
