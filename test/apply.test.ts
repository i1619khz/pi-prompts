import { describe, expect, test } from "bun:test";
import { applyPatches, type Patch } from "../src/apply";
import { PATCHES } from "../src/patches";

const one: Patch = {
	id: "t1",
	description: "测试用",
	pattern: /^DELETE ME[^\n]*\r?\n?/gm,
	replacement: "",
};

describe("applyPatches", () => {
	test("删掉目标行，保留其余内容", () => {
		const before = "keep one\nDELETE ME please\nkeep two\n";
		const { blocks, changed, misses } = applyPatches([before], [one]);

		expect(changed).toBe(true);
		expect(misses).toEqual([]);
		expect(blocks[0]).toBe("keep one\nkeep two\n");
	});

	test("块数量和顺序不变", () => {
		const { blocks } = applyPatches(["a\nDELETE ME\n", "b", "c"], [one]);
		expect(blocks.length).toBe(3);
		expect(blocks[1]).toBe("b");
		expect(blocks[2]).toBe("c");
	});

	test("没命中时报告 miss，内容保持不变", () => {
		const { blocks, changed, misses } = applyPatches(["nothing here"], [one]);

		expect(changed).toBe(false);
		expect(misses.map(m => m.id)).toEqual(["t1"]);
		expect(blocks[0]).toBe("nothing here");
	});

	test("跨块生效：补丁只命中第二个块", () => {
		const { blocks, misses } = applyPatches(["clean", "DELETE ME\nrest"], [one]);
		expect(misses).toEqual([]);
		expect(blocks[0]).toBe("clean");
		expect(blocks[1]).toBe("rest");
	});

	test("同一行重复出现时全部删掉", () => {
		const { blocks } = applyPatches(["DELETE ME\nmid\nDELETE ME\n"], [one]);
		expect(blocks[0]).toBe("mid\n");
	});

	test("空块数组返回空结果，不报 miss", () => {
		const { blocks, changed, misses } = applyPatches([], [one]);
		expect(blocks).toEqual([]);
		expect(changed).toBe(false);
		expect(misses.length).toBe(1);
	});

	test("CRLF 也能匹配", () => {
		const { blocks, changed } = applyPatches(["DELETE ME\r\nrest\r\n"], [one]);
		expect(changed).toBe(true);
		expect(blocks[0]).toBe("rest\r\n");
	});
});

describe("实际补丁", () => {
	const critical = [
		"<critical>",
		"- Each response MUST advance the task; completion only stopping condition.",
		"- MUST default to informed action; do not ask for confirmation when tools or repo context can answer.",
		"- Before yielding, MUST verify significant behavioral changes: run the specific test.",
		"</critical>",
	].join("\n");

	test("整块删除，前后内容保留", () => {
		const before = `intro line\n\n${critical}\n\ntail line\n`;
		const { blocks, misses } = applyPatches([before], PATCHES);

		expect(misses).toEqual([]);
		expect(blocks[0]).not.toContain("<critical>");
		expect(blocks[0]).not.toContain("MUST");
		expect(blocks[0]).toContain("intro line");
		expect(blocks[0]).toContain("tail line");
	});

	test("子代理变体同样删除", () => {
		const sub = [
			"<critical>",
			"- Each response MUST advance the task; completion only stopping condition.",
			"- Changes complete → yield; verification is main agent's job.",
			"</critical>",
		].join("\n");
		const { blocks, misses } = applyPatches([sub], PATCHES);

		expect(misses).toEqual([]);
		expect(blocks[0].trim()).toBe("");
	});

	test("CRLF 包裹的块也能删", () => {
		const crlf = critical.replace(/\n/g, "\r\n");
		const { blocks, changed } = applyPatches([`before\r\n${crlf}\r\nafter\r\n`], PATCHES);

		expect(changed).toBe(true);
		expect(blocks[0]).not.toContain("critical");
		expect(blocks[0]).toContain("before");
		expect(blocks[0]).toContain("after");
	});

	test("没有该块时报 miss，内容不变", () => {
		const { blocks, changed, misses } = applyPatches(["plain prompt text"], PATCHES);
		expect(changed).toBe(false);
		expect(blocks[0]).toBe("plain prompt text");
		expect(misses.map(m => m.id)).toEqual(["drop-critical-block"]);
	});
});
