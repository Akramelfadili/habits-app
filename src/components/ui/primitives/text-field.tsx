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
	error?: string;
	helper?: string;
	hideLabel?: boolean;
	disabled?: boolean;
	maxLength?: number;
	autoFocus?: boolean;
	multiline?: boolean;
	onSubmitEditing?: () => void;
	returnKeyType?: ReturnKeyTypeOptions;
	keyboardType?: KeyboardTypeOptions;
	inputRef?: Ref<TextInputInstance>;
	limitMessage?: (limit: number) => string;
};

const FOCUS_WIDTH = 1.5;

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
	const borderColor = error
		? colors.dangerBg
		: isFocused
			? colors.accent
			: colors.border;
	const borderWidth = error || !isFocused ? 1 : FOCUS_WIDTH;
	const atLimit = maxLength !== undefined && value.length >= maxLength;
	const showLimit =
		atLimit && limitMessage !== undefined && !error && !disabled;
	// Tying the separate helper line to the input lets a VoiceOver user hear why the field is invalid.
	const hint = error ?? (showLimit ? limitMessage?.(maxLength ?? 0) : helper);

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
					// The visible label is a sibling Text, so without this VoiceOver announces an unnamed field.
					accessibilityLabel={label}
					accessibilityHint={hint}
					accessibilityState={{ disabled }}
					editable={!disabled}
					keyboardAppearance={scheme}
					value={value}
					// Slicing too covers a paste over the limit (trimmed, not rejected). A value already over it
					// (a legacy habit name) is never cut by an edit.
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
					// A single-line field blurs on Return unless told to stay; "next" hands focus on, so the keyboard must not drop.
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
		outlineWidth: 0,
		outlineColor: "transparent",
	},
	multiline: {
		textAlignVertical: "top",
	},
});
