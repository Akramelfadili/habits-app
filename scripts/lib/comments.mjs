// Finds the comments and the test titles (describe, it, test strings) of a
// TypeScript or JavaScript source text, with their line numbers.
import { createRequire } from "node:module";

const ts = createRequire(import.meta.url)("typescript");

const TEST_FUNCTIONS = new Set(["describe", "it", "test"]);
const TEST_MODIFIERS = /^(skip|only|each|todo|concurrent|failing)$/;

function isTestCallee(expr) {
	if (ts.isIdentifier(expr)) return TEST_FUNCTIONS.has(expr.text);
	if (ts.isPropertyAccessExpression(expr))
		return isTestCallee(expr.expression) && TEST_MODIFIERS.test(expr.name.text);
	if (ts.isCallExpression(expr)) return isTestCallee(expr.expression);
	return false;
}

function kindFor(file) {
	if (/\.tsx$/.test(file)) return ts.ScriptKind.TSX;
	if (/\.ts$/.test(file)) return ts.ScriptKind.TS;
	return ts.ScriptKind.JS;
}

/** @returns {{comments: {line: number, endLine: number, text: string}[], titles: {line: number, text: string}[]}} */
export function scanSource(file, text) {
	const sf = ts.createSourceFile(
		file,
		text,
		ts.ScriptTarget.ESNext,
		true,
		kindFor(file),
	);
	const seen = new Map();
	const titles = [];
	const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
	const collect = (ranges) => {
		for (const r of ranges ?? []) seen.set(r.pos, r);
	};
	const visit = (node) => {
		collect(ts.getLeadingCommentRanges(text, node.getFullStart()));
		collect(ts.getTrailingCommentRanges(text, node.end));
		if (
			ts.isCallExpression(node) &&
			isTestCallee(node.expression) &&
			node.arguments[0] &&
			ts.isStringLiteralLike(node.arguments[0])
		) {
			titles.push({
				line: lineOf(node.arguments[0].getStart()),
				text: node.arguments[0].text,
			});
		}
		for (const child of node.getChildren(sf)) visit(child);
	};
	visit(sf);
	const comments = [...seen.values()]
		.sort((a, b) => a.pos - b.pos)
		.map((r) => ({
			line: lineOf(r.pos),
			endLine: lineOf(r.end),
			text: text.slice(r.pos, r.end),
		}));
	return { comments, titles };
}
