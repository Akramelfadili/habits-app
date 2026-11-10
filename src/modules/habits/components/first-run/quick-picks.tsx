import { StyleSheet, View } from "react-native";
import { Chip } from "@/components/ui/primitives/chip";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space } from "@/theme/theme";
import { firstRunCopy } from "../../messages";
import {
	FIRST_RUN_QUICK_PICK_IDS,
	findSuggestion,
	type Suggestion,
} from "../../suggestions";

type QuickPicksProps = {
	selectedName: string;
	onPick: (suggestion: Suggestion) => void;
};

export function QuickPicks({ selectedName, onPick }: QuickPicksProps) {
	return (
		<View style={styles.field}>
			<SectionLabel>{firstRunCopy.habit.pickLabel}</SectionLabel>
			<View style={styles.chips}>
				{FIRST_RUN_QUICK_PICK_IDS.map((id) => {
					const suggestion = findSuggestion(id);
					if (!suggestion) return null;
					return (
						<Chip
							key={id}
							label={suggestion.name}
							selected={selectedName === suggestion.name}
							onPress={() => onPick(suggestion)}
						/>
					);
				})}
			</View>
		</View>
	);
}

export function SlimFormNote() {
	return (
		<FieldHelper plain tone="hint">
			{firstRunCopy.habit.note}
		</FieldHelper>
	);
}

const styles = StyleSheet.create({
	field: {
		gap: space[150],
	},
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: space[100],
	},
});
