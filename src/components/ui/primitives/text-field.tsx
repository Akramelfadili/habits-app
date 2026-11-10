import { type Ref, useEffect, useRef, useState } from "react";
import {
	AccessibilityInfo,
	type KeyboardTypeOptions,
	type ReturnKeyTypeOptions,
	StyleSheet,
	TextInput,
	type TextInputInstance,
	View,
} from "react-native";
import { radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { CharacterCounter } from "./character-counter";
import { FieldHelper } from "./field-helper";
import { SectionLabel } from "./section-label";

type TextFieldProps = {
	label: string;
	value: string;
	onChangeText: (text: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
	placeholder?: string;
	/** Input that can't be used as-is: danger outline, "!" and words under the card. */
	error?: string;
	helper?: string;
	/** An inline field with no caps label above it (the category rename): the name stays for VoiceOver. */
	hideLabel?: boolean;
	/** Locked, with the reason under the card ("Built-in categories can't be renamed"). */
	disabled?: boolean;
	maxLength?: number;
	autoFocus?: boolean;
	multiline?: boolean;
	/** Return key, e.g. saving an inline rename. Dismisses the keyboard unless the handler moves focus. */
	onSubmitEditing?: () => void;
	/** "next" when Return moves to another field; otherwise "done" whenever there is a handler. */
	returnKeyType?: ReturnKeyTypeOptions;
	/** The on-screen keyboard, e.g. "number-pad" for a count. */
	keyboardType?: KeyboardTypeOptions;
	inputRef?: Ref<TextInputInstance>;
	/** What "N characters max" reads at the cap; the field announces it when typing stops. */
	limitMessage?: (limit: number) => string;
};

/** The focused outline is 1.5 pt of accent. */
const FOCUS_WIDTH = 1.5;

/**
 * A card with the label (caption caps) and the counter on one row, the value under it, and one
 * helper line under the card: hint, blocking reason, amber limit notice or a red error, in that
 * order of rank. The counter shows from 80 % of `maxLength` and turns amber at it; typing stops
 * there and a longer paste is trimmed to fit.
 */
export function TextField({
	label,
	value,
	onChangeText,
	onBlur,
	onFocus,
	placeholder,
	error,
	helper,
	hideLabel = false,
	disabled = false,
	maxLength,
	autoFocus,
	multiline = false,
	onSubmitEditing,
	returnKeyType,
	keyboardType,
	inputRef,
	limitMessage,
}: TextFieldProps) {
	const { colors, scheme, opacity } = useTheme();
	const [isFocused, setIsFocused] = useState(false);
	// Error outranks focus: a field being corrected keeps its outline.
	const borderColor = error
		? colors.dangerBg
		: isFocused
			? colors.accent
			: colors.border;
	const borderWidth = error || !isFocused ? 1 : FOCUS_WIDTH;
	const atLimit = maxLength !== undefined && value.length >= maxLength;
	const showLimit =
		atLimit && limitMessage !== undefined && !error && !disabled;
	// The helper line is a separate element; tying it to the input means a VoiceOver user who lands on
	// the field hears why it is invalid.
	const hint = error ?? (showLimit ? limitMessage?.(maxLength ?? 0) : helper);

	// Say the error once when it appears, not on every render or keystroke.
	const hadError = useRef(false);
	useEffect(() => {
		const hasError = !!error;
		if (hasError && !hadError.current) {
			AccessibilityInfo.announceForAccessibility(error);
		}
		hadError.current = hasError;
	}, [error]);

	return (
		<View style={styles.root}>
			<View
				testID="text-field"
				style={[
					styles.card,
					{ backgroundColor: colors.card, borderColor, borderWidth },
					disabled && { opacity: opacity.disabled },
				]}
			>
				<View style={[styles.labelRow, hideLabel && styles.counterOnly]}>
					{hideLabel ? null : <SectionLabel>{label}</SectionLabel>}
					{maxLength !== undefined && !disabled ? (
						<CharacterCounter length={value.length} limit={maxLength} />
					) : null}
				</View>
				<TextInput
					ref={inputRef}
					// The visible label is a sibling Text, not associated with the input —
					// without this, VoiceOver announces an unnamed text field.
					accessibilityLabel={label}
					accessibilityHint={hint}
					accessibilityState={{ disabled }}
					editable={!disabled}
					// The on-screen keyboard follows the app's Appearance choice, not just iOS's.
					keyboardAppearance={scheme}
					value={value}
					// `maxLength` stops typing; slicing too covers a paste that arrives over the limit, so it's trimmed
					// to fit rather than rejected. A value already over the limit (a legacy habit name) is never cut by
					// an edit: deleting shortens it one character at a time as usual.
					onChangeText={(text) =>
						onChangeText(
							maxLength !== undefined
								? text.slice(0, Math.max(maxLength, value.length))
								: text,
						)
					}
					onFocus={() => {
						setIsFocused(true);
						onFocus?.();
					}}
					onBlur={() => {
						setIsFocused(false);
						onBlur?.();
					}}
					placeholder={placeholder}
					placeholderTextColor={colors.faint}
					maxLength={maxLength}
					autoFocus={autoFocus}
					multiline={multiline}
					onSubmitEditing={onSubmitEditing}
					keyboardType={keyboardType}
					returnKeyType={
						returnKeyType ?? (onSubmitEditing ? "done" : undefined)
					}
					// A single-line field blurs on Return unless told to stay; "next" hands
					// focus on in the handler, so the keyboard must not drop in between.
					submitBehavior={returnKeyType === "next" ? "submit" : undefined}
					style={[
						styles.input,
						multiline && styles.multiline,
						{ color: colors.ink },
					]}
				/>
			</View>
			{error ? (
				<FieldHelper tone="error">{error}</FieldHelper>
			) : showLimit && limitMessage ? (
				<FieldHelper tone="limit">{limitMessage(maxLength ?? 0)}</FieldHelper>
			) : helper ? (
				<FieldHelper tone="hint">{helper}</FieldHelper>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		gap: space[150],
	},
	card: {
		gap: space[50],
		borderRadius: radius.l,
		paddingHorizontal: space[350],
		paddingVertical: space[250],
	},
	labelRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	counterOnly: {
		justifyContent: "flex-end",
	},
	input: {
		paddingVertical: space[50],
		...textStyles.bodyLg,
		// The card's own outline is the focus ring; drop the browser's on web.
		outlineWidth: 0,
		outlineColor: "transparent",
	},
	multiline: {
		// No fixed height: grows with the text, starting at one line.
		textAlignVertical: "top",
	},
});
