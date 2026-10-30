import { SymbolView } from "expo-symbols";
import { type Ref, useState } from "react";
import {
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	type TextInputInstance,
	View,
} from "react-native";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type SearchFieldProps = {
	value: string;
	onChangeText: (text: string) => void;
	/** "Search habits" — also what VoiceOver calls the field. */
	label: string;
	/** The word on the button that ends a search ("Cancel"); it shows while the field is focused or has text. */
	cancelLabel: string;
	/** Ends the search: the screen clears the text and drops focus. */
	onCancel: () => void;
	/** "Clear text" — the button inside the field, shown with text. */
	clearLabel: string;
	onFocus?: () => void;
	onBlur?: () => void;
	inputRef?: Ref<TextInputInstance>;
};

/**
 * The V3-16 text field's search variant (H1–H3): the inset fill, radius `l`, a
 * magnifier, and a Cancel that appears once the field is in use. Idle it is a
 * 44 pt fill; focused it takes the ink outline every field takes (F-06). The
 * field is a search field to VoiceOver ("Search habits, search field") and the
 * clear and Cancel buttons are their own 44 pt stops.
 */
export function SearchField({
	value,
	onChangeText,
	label,
	cancelLabel,
	onCancel,
	clearLabel,
	onFocus,
	onBlur,
	inputRef,
}: SearchFieldProps) {
	const { colors, scheme, opacity } = useTheme();
	const [isFocused, setIsFocused] = useState(false);
	const inUse = isFocused || value.length > 0;

	return (
		<View style={styles.row}>
			<View
				testID="search-field"
				style={[
					styles.field,
					{
						backgroundColor: colors.inner,
						borderColor: isFocused ? colors.ink : "transparent",
					},
				]}
			>
				<SymbolView
					name="magnifyingglass"
					size={14}
					tintColor={colors.faint}
					style={styles.glyph}
				/>
				<TextInput
					ref={inputRef}
					accessibilityRole="search"
					accessibilityLabel={label}
					keyboardAppearance={scheme}
					value={value}
					onChangeText={onChangeText}
					onFocus={() => {
						setIsFocused(true);
						onFocus?.();
					}}
					onBlur={() => {
						setIsFocused(false);
						onBlur?.();
					}}
					placeholder={label}
					placeholderTextColor={colors.faint}
					returnKeyType="search"
					autoCorrect={false}
					autoCapitalize="none"
					clearButtonMode="never"
					style={[styles.input, { color: colors.ink }]}
				/>
				{value.length > 0 ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={clearLabel}
						onPress={() => onChangeText("")}
						style={({ pressed }) => [
							styles.clear,
							pressed && { opacity: opacity.pressed },
						]}
					>
						<SymbolView
							name="xmark.circle.fill"
							size={16}
							tintColor={colors.faint}
						/>
					</Pressable>
				) : null}
			</View>
			{inUse ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={cancelLabel}
					onPress={onCancel}
					style={({ pressed }) => [
						styles.cancel,
						pressed && { opacity: opacity.pressed },
					]}
				>
					<Text style={[styles.cancelLabel, { color: colors.ink }]}>
						{cancelLabel}
					</Text>
				</Pressable>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[100],
	},
	field: {
		flex: 1,
		minHeight: minTouchTarget,
		flexDirection: "row",
		alignItems: "center",
		borderRadius: radius.l,
		borderWidth: 1,
		paddingLeft: space[350],
		gap: space[200],
	},
	glyph: {
		width: 14,
		height: 14,
	},
	input: {
		...textStyles.bodyLg,
		flex: 1,
		paddingVertical: space[200],
		// The field draws its own focus outline (the ink border); the browser's must not stack on it.
		outlineWidth: 0,
	},
	clear: {
		width: minTouchTarget,
		height: minTouchTarget,
		alignItems: "center",
		justifyContent: "center",
	},
	cancel: {
		minWidth: minTouchTarget,
		minHeight: minTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: space[200],
	},
	cancelLabel: {
		...textStyles.body,
	},
});
