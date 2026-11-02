import type { Ref } from "react";
import {
	type HostInstance,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { Button } from "../primitives/button";
import { IconBadge } from "../primitives/icon-badge";

type BannerProps = {
	/** The message. With a `title` it is the line under it. */
	children: string;
	/** A first line in the body ink — "Archived on 12 October" (V3-27's card). */
	title?: string;
	/**
	 * "warning" is the amber conflict banner (a reminder on a day the habit
	 * isn't scheduled); "neutral" the grey persistent notice (notifications
	 * turned off for the app, an archived or restored habit); "notice" the
	 * quiet grey line with an amber dot (D6's streak-reset note); "error" a
	 * failed write where no toast can show (DC4).
	 */
	tone?: "warning" | "neutral" | "notice" | "error";
	/**
	 * A glyph in an icon square: the banner becomes V3-27's card (surface and
	 * hairline, danger outline for an error) instead of the one-line marker.
	 */
	symbol?: SFSymbol;
	/** A link under the message — "Open iOS Settings →" (HAB-15). */
	action?: { label: string; onPress: () => void };
	/** A compact button after the text — "Restore" (D4). Drops under the text at accessibility sizes. */
	button?: { label: string; onPress: () => void; disabled?: boolean };
	/** The message element, for a caller that moves the screen reader's focus onto a failure (`useInitialFocus`). */
	messageRef?: Ref<HostInstance>;
};

/**
 * V3-27 · inline banner: a state that lasts, inside the content and never over
 * it. The marker form is one line with a dot; the card form (with a `symbol`)
 * is an icon square, an optional title, the message and optionally a button.
 * The title and message are one VoiceOver stop; the button and link are their
 * own. An error banner is an alert, so it is read out when it appears. Meaning
 * is never colour alone: the dot, the glyph and the words say it too.
 */
export function Banner({
	children,
	title,
	tone = "warning",
	symbol,
	action,
	button,
	messageRef,
}: BannerProps) {
	const { colors, opacity } = useTheme();
	const largeText = useAccessibilityTextSize();
	const warning = tone === "warning";
	const error = tone === "error";
	const card = symbol !== undefined;
	const amberDot = warning || tone === "notice";

	const text = (
		<View
			ref={messageRef}
			accessible
			accessibilityRole={error ? "alert" : undefined}
			accessibilityLabel={title ? `${title}. ${children}` : children}
			style={styles.text}
		>
			{title ? (
				<Text
					style={[
						styles.title,
						{
							color:
								error && card
									? colors.dangerBg
									: warning && card
										? colors.warnInk
										: colors.ink,
						},
					]}
				>
					{title}
				</Text>
			) : null}
			<Text
				style={[
					styles.message,
					{
						color:
							warning || error || tone === "notice" || title
								? colors.ink
								: colors.sub,
					},
				]}
			>
				{children}
			</Text>
		</View>
	);

	return (
		<View
			testID="banner"
			style={[
				styles.banner,
				card && warning
					? // R5 / SY6: the amber card — warn tint, no outline, the title in warn ink.
						{ backgroundColor: colors.warnTint }
					: card
						? {
								backgroundColor: colors.card,
								borderColor: error ? colors.dangerBg : colors.border,
								borderWidth: error ? 1 : StyleSheet.hairlineWidth,
							}
						: { backgroundColor: warning ? colors.warnTint : colors.inner },
				largeText && styles.stacked,
			]}
		>
			<View style={styles.main}>
				{card ? (
					<IconBadge
						symbol={symbol}
						accent={
							error
								? { tint: colors.inner, ink: colors.dangerBg }
								: warning
									? { tint: colors.warnTint, ink: colors.warnInk }
									: undefined
						}
					/>
				) : (
					<View
						testID="banner-marker"
						style={[
							styles.marker,
							amberDot && { backgroundColor: colors.warnInk },
							error && { backgroundColor: colors.dangerBg },
							!amberDot &&
								!error && [styles.ring, { borderColor: colors.faint }],
						]}
					/>
				)}
				<View style={styles.body}>
					{text}
					{action ? (
						<Pressable
							accessibilityRole="link"
							onPress={action.onPress}
							style={({ pressed }) => [
								styles.actionHit,
								pressed && { opacity: opacity.pressed },
							]}
						>
							<Text style={[styles.action, { color: colors.ink }]}>
								{action.label}
							</Text>
						</Pressable>
					) : null}
				</View>
			</View>
			{button ? (
				<View style={largeText ? styles.buttonStacked : undefined}>
					<Button
						label={button.label}
						variant="secondary"
						size="small"
						fullWidth={false}
						disabled={button.disabled}
						onPress={button.onPress}
					/>
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	banner: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: radius.l,
		padding: space[300],
		gap: space[300],
	},
	stacked: {
		flexDirection: "column",
		alignItems: "stretch",
		padding: space[400],
	},
	main: {
		flex: 1,
		flexDirection: "row",
		alignItems: "flex-start",
		gap: space[300],
	},
	marker: {
		width: 10,
		height: 10,
		borderRadius: 5,
		marginTop: space[100],
	},
	ring: {
		width: 14,
		height: 14,
		borderRadius: 7,
		borderWidth: 1.5,
		marginTop: space[50],
	},
	body: {
		flex: 1,
		gap: space[150],
	},
	text: {
		gap: space[50],
	},
	title: {
		...textStyles.callout,
	},
	message: {
		...textStyles.footnote,
	},
	actionHit: {
		minHeight: minTouchTarget,
		justifyContent: "center",
	},
	action: {
		...textStyles.caption,
		fontWeight: "600",
	},
	buttonStacked: {
		alignItems: "flex-start",
	},
});
