import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { resolveAgentDir, resolveShadowingLiteral, resolveTemplateTarget } from "../src/paths";

const home = join("C:", "Users", "test");

describe("resolveAgentDir", () => {
	test("默认走 ~/.omp/agent", () => {
		expect(resolveAgentDir({}, home)).toBe(join(home, ".omp", "agent"));
	});

	test("PI_CONFIG_DIR 替换配置根目录", () => {
		expect(resolveAgentDir({ PI_CONFIG_DIR: "D:/cfg" }, home)).toBe(join("D:/cfg", "agent"));
	});

	test("PI_CODING_AGENT_DIR 优先级最高", () => {
		const env = { PI_CODING_AGENT_DIR: "E:/custom", PI_CONFIG_DIR: "D:/cfg" };
		expect(resolveAgentDir(env, home)).toBe("E:/custom");
	});
});

describe("resolveTemplateTarget", () => {
	test("用户级写到 agent 目录", () => {
		expect(resolveTemplateTarget("user", {}, home, "D:/repo")).toBe(
			join(home, ".omp", "agent", "SYSTEM_TEMPLATE.md"),
		);
	});

	test("项目级写到 <cwd>/.omp", () => {
		expect(resolveTemplateTarget("project", {}, home, "D:/repo")).toBe(
			join("D:/repo", ".omp", "SYSTEM_TEMPLATE.md"),
		);
	});

	test("项目级不受 PI_CODING_AGENT_DIR 影响", () => {
		const env = { PI_CODING_AGENT_DIR: "E:/custom" };
		expect(resolveTemplateTarget("project", env, home, "D:/repo")).toBe(
			join("D:/repo", ".omp", "SYSTEM_TEMPLATE.md"),
		);
	});
});

describe("resolveShadowingLiteral", () => {
	test("同目录的 SYSTEM.md", () => {
		expect(resolveShadowingLiteral(join("C:", "a", "SYSTEM_TEMPLATE.md"))).toBe(
			join("C:", "a", "SYSTEM.md"),
		);
	});
});
