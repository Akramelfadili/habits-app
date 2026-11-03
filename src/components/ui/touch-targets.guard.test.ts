/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * HAB-49 / 08.2: every pressable has a hit area of at least 44 × 44 pt, or an
 * entry in the exceptions map below that says why not.
 *
 * Static, because Jest has no layout: for each `<Pressable>` (and the other
 * `Touchable*` components) in the app source it reads the element's `style`
 * (resolving `styles.x` against the file's `StyleSheet.create`) and its
 * `hitSlop`, and checks both axes:
 *
 *  - an explicit `width` / `height` / `minWidth` / `minHeight` (plus the slop on
 *    both sides) under 44 fails;
 *  - an axis with no explicit size passes only if the element fills it
 *    (`flex`, `alignSelf: "stretch"`, `width: "100%"`, absolute fill) or it sets
 *    `minHeight`/`minWidth` of 44 on the other route; otherwise it is
 *    "unproven" and fails too, so a new pressable has to say how big it is.
 *
 * An exception is keyed `file::index` (the nth pressable in the file) and
 * carries its reason. Removing a pressable leaves a stale entry, which fails.
 */

/**
 * Pressables the touch-target guard cannot prove are 44 × 44 pt, each with the
 * reason (HAB-49, 08.2). Keyed `file::n` (the nth pressable in the file).
 *
 * Two kinds: the size comes from something the static reader cannot follow
 * (padding plus content, a computed hit slop, a parent that stretches it), or
 * it really is under 44 and the spec says so. The second kind is marked
 * "BELOW 44". Add nothing here without a reason a reviewer could check.
 */
const TOUCH_TARGET_EXCEPTIONS: Record<string, string> = {
	"components/ui/composite/action-card.tsx::0":
		"A full-width card row: 14 pt padding top and bottom around a 40 pt icon square, so it is at least 68 pt tall and as wide as its column.",
	"components/ui/composite/completion-cell.tsx::0":
		"The cell is `size` pt (16–40 by use) and `hitSlop = ceil((44 − size) / 2)` is added on each side, so the area is 44 pt in both directions whenever size ≤ 44 (the Month calendar's 40 pt cell and the one-habit week block's 40 pt cell). Adjacent cells touch their neighbours' slop only where the cells are 2 pt apart, the documented 08.2 pitch.",
	"components/ui/composite/sheet.tsx::0":
		"The scrim: `StyleSheet.absoluteFill` over the whole screen, a tap closes the sheet. Not a control to aim at.",
	"components/ui/composite/week-matrix.tsx::0":
		"BELOW 44 (width), by design: the Week matrix day headers are 44 pt high and 28 pt wide, the cell pitch; a 44 pt-wide target would overlap its neighbours. Documented in feature-spec-v3 'Spec wins over the mockup' (P1) and in the backlog's V3-6 audit list.",
	"components/ui/primitives/button.tsx::0":
		'`size="small"` sets `minHeight: 0` because its height comes from padding (6 pt above and below a 20 pt line is 32 pt), plus the 8 pt hitSlop every non-full-width button gets, so 48 pt. Every other size has `minHeight` 44 (compact is 36 + a 4 pt slop each side).',
	"components/ui/primitives/toggle.tsx::0":
		"The switch is 51 pt wide and the touch area is `minHeight` 44 around it, so 51 × 44. ToggleRow makes the whole row the target.",
	"modules/habits/components/detail/week-history-card.tsx::0":
		"One Detail week row: `minHeight` 44 and as wide as the card (a column child that stretches).",
};

const MIN = 44;
const SRC = path.join(__dirname, "../..");
const KNOWN: Record<string, number> = { minTouchTarget: MIN };
const SPACE: Record<string, number> = {
	50: 2,
	100: 4,
	150: 6,
	200: 8,
	250: 10,
	300: 12,
	350: 14,
	400: 16,
	500: 20,
	600: 24,
	800: 32,
};
const TOUCHABLES = new Set([
	"Pressable",
	"TouchableOpacity",
	"TouchableHighlight",
	"TouchableWithoutFeedback",
	"TouchableNativeFeedback",
]);

function sourceFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(full);
		return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)
			? [full]
			: [];
	});
}

type Props = Record<string, number | string | boolean>;

/** A tiny constant evaluator: literals, known tokens, local numeric consts, + - * /. */
function evaluate(
	node: ts.Node,
	consts: Map<string, number>,
): number | undefined {
	if (ts.isNumericLiteral(node)) return Number(node.text);
	if (ts.isParenthesizedExpression(node))
		return evaluate(node.expression, consts);
	if (
		ts.isPrefixUnaryExpression(node) &&
		node.operator === ts.SyntaxKind.MinusToken
	) {
		const v = evaluate(node.operand, consts);
		return v === undefined ? undefined : -v;
	}
	if (ts.isIdentifier(node)) return consts.get(node.text) ?? KNOWN[node.text];
	if (
		ts.isElementAccessExpression(node) &&
		ts.isIdentifier(node.expression) &&
		node.expression.text === "space"
	) {
		return SPACE[node.argumentExpression.getText()];
	}
	if (ts.isBinaryExpression(node)) {
		const l = evaluate(node.left, consts);
		const r = evaluate(node.right, consts);
		if (l === undefined || r === undefined) return undefined;
		switch (node.operatorToken.kind) {
			case ts.SyntaxKind.PlusToken:
				return l + r;
			case ts.SyntaxKind.MinusToken:
				return l - r;
			case ts.SyntaxKind.AsteriskToken:
				return l * r;
			case ts.SyntaxKind.SlashToken:
				return l / r;
		}
	}
	return undefined;
}

/** `const styles = StyleSheet.create({ a: { ... } })` → { a: { width: 40, ... } }. */
function readStyles(
	source: ts.SourceFile,
	consts: Map<string, number>,
): Map<string, Props> {
	const out = new Map<string, Props>();
	const visit = (node: ts.Node) => {
		if (
			ts.isCallExpression(node) &&
			node.expression.getText() === "StyleSheet.create" &&
			node.arguments[0] &&
			ts.isObjectLiteralExpression(node.arguments[0])
		) {
			for (const entry of node.arguments[0].properties) {
				if (
					!ts.isPropertyAssignment(entry) ||
					!ts.isObjectLiteralExpression(entry.initializer)
				)
					continue;
				const props: Props = {};
				for (const p of entry.initializer.properties) {
					if (!ts.isPropertyAssignment(p)) continue;
					const key = p.name.getText();
					const n = evaluate(p.initializer, consts);
					if (n !== undefined) props[key] = n;
					else if (ts.isStringLiteral(p.initializer))
						props[key] = p.initializer.text;
					else if (p.initializer.getText() === "StyleSheet.absoluteFill")
						props[key] = true;
					else props[key] = true;
				}
				out.set(entry.name.getText(), props);
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return out;
}

function readConsts(source: ts.SourceFile): Map<string, number> {
	const consts = new Map<string, number>();
	// Two passes so a const may use an earlier one.
	for (let pass = 0; pass < 2; pass++) {
		source.forEachChild((node) => {
			if (!ts.isVariableStatement(node)) return;
			for (const d of node.declarationList.declarations) {
				if (!ts.isIdentifier(d.name) || !d.initializer) continue;
				const v = evaluate(d.initializer, consts);
				if (v !== undefined) consts.set(d.name.text, v);
			}
		});
	}
	return consts;
}

function slopOf(
	attrs: ts.JsxAttributes,
	consts: Map<string, number>,
): { x: number; y: number } {
	const attr = attrs.properties.find(
		(p): p is ts.JsxAttribute =>
			ts.isJsxAttribute(p) && p.name.getText() === "hitSlop",
	);
	const init = attr?.initializer;
	if (!init || !ts.isJsxExpression(init) || !init.expression)
		return { x: 0, y: 0 };
	const e = init.expression;
	const n = evaluate(e, consts);
	if (n !== undefined) return { x: n, y: n };
	if (ts.isObjectLiteralExpression(e)) {
		const get = (k: string) => {
			const p = e.properties.find(
				(q): q is ts.PropertyAssignment =>
					ts.isPropertyAssignment(q) && q.name.getText() === k,
			);
			return (p && evaluate(p.initializer, consts)) || 0;
		};
		return {
			x: Math.min(get("left"), get("right")),
			y: Math.min(get("top"), get("bottom")),
		};
	}
	// A variable or a conditional: take the smallest literal we can see (a
	// conditional slop is not proof).
	const nums = [...e.getText().matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
	const via = nums.length ? Math.min(...nums) : 0;
	return { x: via, y: via };
}

export type Finding = { key: string; problem: string };

function check(file: string): Finding[] {
	const text = fs.readFileSync(file, "utf8");
	if (!/Touchable|Pressable/.test(text)) return [];
	const source = ts.createSourceFile(
		file,
		text,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const consts = readConsts(source);
	const styles = readStyles(source, consts);
	const rel = path.relative(SRC, file);
	const findings: Finding[] = [];
	let index = 0;

	const visit = (node: ts.Node) => {
		const opening = ts.isJsxOpeningElement(node)
			? node
			: ts.isJsxSelfClosingElement(node)
				? node
				: undefined;
		if (opening && TOUCHABLES.has(opening.tagName.getText())) {
			const key = `${rel}::${index++}`;
			const styleAttr = opening.attributes.properties.find(
				(p): p is ts.JsxAttribute =>
					ts.isJsxAttribute(p) && p.name.getText() === "style",
			);
			const styleText = styleAttr?.initializer?.getText() ?? "";
			const refs = [...styleText.matchAll(/\bstyles\.(\w+)/g)].map((m) => m[1]);
			const slop = slopOf(opening.attributes, consts);
			const problems: string[] = [];
			const body = ts.isJsxOpeningElement(opening)
				? opening.parent.getText()
				: "";
			const labelled = /<Text\b|\{children\}|\{label\}/.test(body);
			const heightOk = refs.some((ref) => {
				const v = styles.get(ref)?.minHeight ?? styles.get(ref)?.height;
				return typeof v === "number" && v + 2 * slop.y >= MIN;
			});
			for (const axis of ["x", "y"] as const) {
				const size =
					axis === "x" ? ["width", "minWidth"] : ["height", "minHeight"];
				const explicit: number[] = [];
				let fills = false;
				for (const ref of refs) {
					const props = styles.get(ref);
					if (!props) continue;
					if (
						props.flex !== undefined ||
						props.flexGrow !== undefined ||
						(axis === "x" &&
							(props.width === "100%" || props.alignSelf === "stretch")) ||
						(axis === "y" && props.height === "100%") ||
						props.position === "absolute"
					)
						fills = true;
					for (const k of size) {
						const v = props[k];
						if (typeof v === "number")
							explicit.push(v + 2 * (axis === "x" ? slop.x : slop.y));
					}
				}
				const label = axis === "x" ? "width" : "height";
				if (explicit.length > 0 && Math.min(...explicit) < MIN && !fills) {
					problems.push(`${label} ${Math.min(...explicit)} < ${MIN}`);
				} else if (explicit.length === 0 && !fills) {
					// A labelled control is as wide as its label plus padding: a text
					// control that is 44 tall is not narrower than 44 in practice.
					if (axis === "x" && labelled && heightOk) continue;
					problems.push(`${label} unproven`);
				} else if (
					explicit.length > 0 &&
					Math.max(...explicit) < MIN &&
					fills
				) {
					// fills, but a stated size under 44 is still a statement
					problems.push(`${label} ${Math.max(...explicit)} < ${MIN}`);
				}
			}
			if (problems.length > 0)
				findings.push({ key, problem: problems.join(", ") });
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return findings;
}

export function scanTouchTargets(): Finding[] {
	return sourceFiles(SRC).flatMap(check);
}

describe("touch-target guard (HAB-49, 08.2)", () => {
	const findings = scanTouchTargets();

	it("every pressable is 44 pt or has a documented exception", () => {
		const unlisted = findings.filter(
			(f) => !(f.key in TOUCH_TARGET_EXCEPTIONS),
		);
		expect(unlisted).toEqual([]);
	});

	it("every exception still matches a pressable that needs it", () => {
		const needed = new Set(findings.map((f) => f.key));
		const stale = Object.keys(TOUCH_TARGET_EXCEPTIONS).filter(
			(k) => !needed.has(k),
		);
		expect(stale).toEqual([]);
	});

	it("every exception gives a reason", () => {
		for (const [key, reason] of Object.entries(TOUCH_TARGET_EXCEPTIONS)) {
			expect({ key, ok: reason.trim().length >= 20 }).toEqual({
				key,
				ok: true,
			});
		}
	});
});
