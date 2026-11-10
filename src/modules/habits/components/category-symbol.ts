import { CATEGORY_SHAPE_SYMBOLS } from "../constants";
import type { CategoryAppearance } from "../types";

export function categorySymbol(appearance: CategoryAppearance) {
	return CATEGORY_SHAPE_SYMBOLS[appearance.shape];
}
