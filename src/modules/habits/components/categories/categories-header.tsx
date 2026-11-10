import {
	HeaderCircleButton,
	HeaderPillButton,
} from "@/components/ui/composite/header-buttons";
import { ScreenHeader } from "@/components/ui/composite/screen-header";
import { categoriesCopy } from "../../messages";

type CategoriesHeaderProps = {
	eyebrow: string;
	accessibilityLabel: string;
	mode: "browse" | "reorder";
	renaming?: boolean;
	onReorder: () => void;
	onDone: () => void;
	onAdd: () => void;
};

export function CategoriesHeader({
	eyebrow,
	accessibilityLabel,
	mode,
	renaming = false,
	onReorder,
	onDone,
	onAdd,
}: CategoriesHeaderProps) {
	return (
		<ScreenHeader
			eyebrow={eyebrow}
			title={categoriesCopy.title}
			accessibilityLabel={accessibilityLabel}
		>
			{mode === "reorder" ? (
				<HeaderPillButton label={categoriesCopy.done} onPress={onDone} />
			) : (
				<>
					{renaming ? null : (
						<HeaderPillButton
							label={categoriesCopy.reorder}
							onPress={onReorder}
						/>
					)}
					<HeaderCircleButton
						symbol="plus"
						accessibilityLabel={categoriesCopy.add}
						onPress={onAdd}
					/>
				</>
			)}
		</ScreenHeader>
	);
}
