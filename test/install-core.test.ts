import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { installTemplate, stateFileFor, type InstallOutcome } from "../src/install-core";

function sandbox(name: string): { dir: string; source: string; target: string } {
	const dir = join(import.meta.dir, "..", ".tmp-test", name);
	mkdirSync(dir, { recursive: true });
	const source = join(dir, "system-prompt.hbs");
	const target = join(dir, "SYSTEM_TEMPLATE.md");
	return { dir, source, target };
}

const V1 = "version one\n{{skills}}\n";
const V2 = "version two\n{{skills}}\n";

describe("installTemplate", () => {
	test("目标不存在时创建，并写状态文件", () => {
		const { source, target } = sandbox("create");
		writeFileSync(source, V1, "utf8");

		const outcome: InstallOutcome = installTemplate({ source, target });

		expect(outcome.kind).toBe("created");
		expect(readFileSync(target, "utf8")).toBe(V1);
		expect(existsSync(stateFileFor(target))).toBe(true);
	});

	test("内容相同时不动文件", () => {
		const { source, target } = sandbox("same");
		writeFileSync(source, V1, "utf8");

		installTemplate({ source, target });
		const second = installTemplate({ source, target });

		expect(second.kind).toBe("up-to-date");
	});

	test("包内模板升级时备份旧文件并覆盖", () => {
		const { source, target } = sandbox("upgrade");
		writeFileSync(source, V1, "utf8");
		installTemplate({ source, target });

		writeFileSync(source, V2, "utf8");
		const outcome = installTemplate({ source, target });

		expect(outcome.kind).toBe("updated");
		if (outcome.kind === "updated") {
			expect(readFileSync(outcome.backup, "utf8")).toBe(V1);
		}
		expect(readFileSync(target, "utf8")).toBe(V2);
	});

	test("用户手改过就不覆盖", () => {
		const { source, target } = sandbox("edited");
		writeFileSync(source, V1, "utf8");
		installTemplate({ source, target });

		const handEdited = `${V1}\n# 我自己加的一行\n`;
		writeFileSync(target, handEdited, "utf8");

		const outcome = installTemplate({ source, target });

		expect(outcome.kind).toBe("user-edited");
		expect(readFileSync(target, "utf8")).toBe(handEdited);
	});

	test("force 时覆盖手改内容", () => {
		const { source, target } = sandbox("force");
		writeFileSync(source, V1, "utf8");
		installTemplate({ source, target });
		writeFileSync(target, "hand edited\n", "utf8");

		const outcome = installTemplate({ source, target, force: true });

		expect(outcome.kind).toBe("updated");
		expect(readFileSync(target, "utf8")).toBe(V1);
	});

	test("源文件缺失时报告，不创建目标", () => {
		const { dir, target } = sandbox("missing");
		const outcome = installTemplate({ source: join(dir, "nope.hbs"), target });

		expect(outcome.kind).toBe("source-missing");
		expect(existsSync(target)).toBe(false);
	});
});
