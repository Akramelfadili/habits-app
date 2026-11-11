import { singleLine } from "./single-line";

describe("singleLine", () => {
	it("replaces every line break, not only the first", () => {
		expect(singleLine("a\nb\nc\nd")).toBe("a b c d");
	});

	it("treats a Windows line break as one space", () => {
		expect(singleLine("a\r\nb\r\nc")).toBe("a b c");
	});

	it("leaves text without a line break alone", () => {
		expect(singleLine("Small habits")).toBe("Small habits");
	});
});
