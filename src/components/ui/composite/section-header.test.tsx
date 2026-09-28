import { render, screen } from "@testing-library/react-native";
import { typeScale } from "@/theme/theme";
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

	it("uses the smaller, semibold card-title size for size small", async () => {
		await render(<SectionHeader title="Per habit" size="small" />);
		expect(screen.getByText("Per habit")).toHaveStyle({
			fontSize: typeScale.rowLabel,
			fontWeight: "600",
		});
	});
});
