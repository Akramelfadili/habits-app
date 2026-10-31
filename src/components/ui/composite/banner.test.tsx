import { fireEvent, render, screen } from "@testing-library/react-native";
import { semanticColors, surfaceColors } from "@/theme/theme";
import { Banner } from "./banner";

describe("Banner", () => {
	it("renders its message on the warning tint by default", async () => {
		await render(<Banner>Saturday is not a scheduled day.</Banner>);
		expect(screen.getByText("Saturday is not a scheduled day.")).toBeTruthy();
		expect(screen.getByTestId("banner")).toHaveStyle({
			backgroundColor: semanticColors.light.warnTint,
		});
		expect(screen.getByTestId("banner-marker")).toHaveStyle({
			backgroundColor: semanticColors.light.warnInk,
		});
	});

	it("neutral tone sits on the inset surface with a hollow ring", async () => {
		await render(<Banner tone="neutral">Notifications are off.</Banner>);
		expect(screen.getByTestId("banner")).toHaveStyle({
			backgroundColor: surfaceColors.light.inner,
		});
		expect(screen.getByTestId("banner-marker")).toHaveStyle({
			borderColor: surfaceColors.light.faint,
		});
	});

	it("error tone sits on the inset surface with a filled danger marker", async () => {
		await render(<Banner tone="error">Couldn't save. Try again.</Banner>);
		expect(screen.getByTestId("banner")).toHaveStyle({
			backgroundColor: surfaceColors.light.inner,
		});
		expect(screen.getByTestId("banner-marker")).toHaveStyle({
			backgroundColor: semanticColors.light.dangerBg,
		});
		expect(screen.getByText("Couldn't save. Try again.")).toHaveStyle({
			color: surfaceColors.light.ink,
		});
	});

	it("shows an action link under the message and fires it (HAB-15)", async () => {
		const onPress = jest.fn();
		await render(
			<Banner tone="neutral" action={{ label: "Open iOS Settings →", onPress }}>
				Notifications are off.
			</Banner>,
		);
		await fireEvent.press(screen.getByText("Open iOS Settings →"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("has no link without an action", async () => {
		await render(<Banner>Plain.</Banner>);
		expect(screen.queryByRole("link")).toBeNull();
	});

	it("notice tone is the quiet grey line with an amber dot (D6)", async () => {
		await render(
			<Banner tone="notice">
				Streak reset on Wed 14 Oct — no freezes were left.
			</Banner>,
		);
		expect(screen.getByTestId("banner")).toHaveStyle({
			backgroundColor: surfaceColors.light.inner,
		});
		expect(screen.getByTestId("banner-marker")).toHaveStyle({
			backgroundColor: semanticColors.light.warnInk,
		});
		expect(
			screen.getByText("Streak reset on Wed 14 Oct — no freezes were left."),
		).toHaveStyle({ color: surfaceColors.light.ink });
	});

	describe("card form (a symbol)", () => {
		it("archived: a surface card with the title, the message and a Restore button (D4)", async () => {
			const onPress = jest.fn();
			await render(
				<Banner
					tone="neutral"
					symbol="archivebox"
					title="Archived on 12 October"
					button={{ label: "Restore", onPress }}
				>
					Hidden from Today. Paused days stay paused and never count as missed.
				</Banner>,
			);
			expect(screen.getByTestId("banner")).toHaveStyle({
				backgroundColor: surfaceColors.light.card,
			});
			expect(screen.queryByTestId("banner-marker")).toBeNull();
			expect(screen.getByText("Archived on 12 October")).toBeTruthy();
			await fireEvent.press(screen.getByRole("button", { name: "Restore" }));
			expect(onPress).toHaveBeenCalledTimes(1);
		});

		it("restored: the same card with no button (D5)", async () => {
			await render(
				<Banner tone="neutral" symbol="info.circle" title="Restored today">
					Your streak starts fresh with the next log. Paused days stay paused.
				</Banner>,
			);
			expect(screen.queryByRole("button")).toBeNull();
			expect(screen.getByText("Restored today")).toBeTruthy();
		});

		it("a disabled button can't be pressed (a restore in flight)", async () => {
			const onPress = jest.fn();
			await render(
				<Banner
					tone="neutral"
					symbol="archivebox"
					title="Archived on 12 October"
					button={{ label: "Restore", onPress, disabled: true }}
				>
					Hidden from Today.
				</Banner>,
			);
			await fireEvent.press(screen.getByRole("button", { name: "Restore" }));
			expect(onPress).not.toHaveBeenCalled();
		});

		it("error: a danger outline, a danger title and an alert that VoiceOver reads (DC4)", async () => {
			await render(
				<Banner
					tone="error"
					symbol="exclamationmark.circle"
					title="Couldn't delete"
				>
					Nothing was changed. Try again.
				</Banner>,
			);
			expect(screen.getByTestId("banner")).toHaveStyle({
				borderColor: semanticColors.light.dangerBg,
				borderWidth: 1,
			});
			expect(screen.getByText("Couldn't delete")).toHaveStyle({
				color: semanticColors.light.dangerBg,
			});
			expect(screen.getByRole("alert")).toHaveProp(
				"accessibilityLabel",
				"Couldn't delete. Nothing was changed. Try again.",
			);
		});
	});

	it("title and message are one VoiceOver stop; the button is its own", async () => {
		await render(
			<Banner
				tone="neutral"
				symbol="archivebox"
				title="Archived on 12 October"
				button={{ label: "Restore", onPress: jest.fn() }}
			>
				Hidden from Today.
			</Banner>,
		);
		expect(
			screen.getByLabelText("Archived on 12 October. Hidden from Today."),
		).toBeTruthy();
	});

	it("card with the warning tone is the amber card: warn tint, no outline, title in warn ink (R5, SY6)", async () => {
		await render(
			<Banner tone="warning" symbol="bell.slash" title="Notifications are off">
				Reminders won’t arrive until you allow them.
			</Banner>,
		);
		expect(screen.getByTestId("banner")).toHaveStyle({
			backgroundColor: semanticColors.light.warnTint,
		});
		expect(screen.getByText("Notifications are off")).toHaveStyle({
			color: semanticColors.light.warnInk,
		});
	});
});
