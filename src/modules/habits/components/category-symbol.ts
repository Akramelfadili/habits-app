import { CATEGORY_SHAPE_SYMBOLS } from "../constants";
import type { CategoryAppearance } from "../types";

/** A habit's (or category's) icon: always its category's shape. */
export function categorySymbol(appearance: CategoryAppearance) {
	return CATEGORY_SHAPE_SYMBOLS[appearance.shape];
}
