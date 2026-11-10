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
	/** Renaming in place draws neither Reorder nor Done. */
	renaming?: boolean;
	onReorder: () => void;
	onDone: () => void;
	onAdd: () => void;
};

/**
 * The counts as an eyebrow, the display title, and, browsing, a Reorder pill beside a + circle or,
 * reordering, Done. Reorder is always there: the built-ins reorder too (Other stays last), so even
 * with no custom category it is offered, unlike the mockup's empty frame.
 */
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
