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

	it("group: compact label with its count right beside it (HAB-25)", async () => {
		await render(<SectionHeader size="group" title="Built-in" count="10" />);
		expect(screen.getByText("Built-in")).toHaveStyle({
			fontSize: typeScale.subtitle,
		});
		expect(screen.getByText("10").parent).toHaveStyle({
			justifyContent: "flex-start",
		});
	});

	it("group: a tag sits at the far edge, only when given (HAB-19)", async () => {
		const view = await render(<SectionHeader size="group" title="Training" />);
		expect(screen.queryByText(/Reordering/)).toBeNull();
		await view.rerender(
			<SectionHeader
				size="group"
				title="Training"
				tag="Reordering within Training"
			/>,
		);
		expect(screen.getByText("Reordering within Training")).toHaveStyle({
			marginLeft: "auto",
		});
	});
});
