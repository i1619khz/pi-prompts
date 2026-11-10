import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { installTemplate } from "../src/install-core";
import {
	defaultEnv,
	defaultHome,
	resolveShadowingLiteral,
	resolveTemplateTarget,
	type Scope,
} from "../src/paths";

const argv = process.argv.slice(2);
const flags = new Set(argv);
const scope: Scope = flags.has("--project") ? "project" : "user";
const force = flags.has("--force");

const source = resolve(import.meta.dir, "..", "system-prompt.hbs");
const target = resolveTemplateTarget(scope, defaultEnv(), defaultHome(), process.cwd());

// 目标位置和现有内容先打出来，覆盖前用户看得见
console.log(`源文件：${source}`);
console.log(`目标：  ${target}`);

const outcome = installTemplate({ source, target, force });

switch (outcome.kind) {
	case "created":
		console.log("已创建。重启 omp 后生效。");
		break;
	case "updated":
		console.log(`已备份原文件：${outcome.backup}`);
		console.log("已更新。重启 omp 后生效。");
		break;
	case "up-to-date":
		console.log("无需更新，内容和源文件一致。");
		break;
	case "user-edited":
		console.log("目标文件被手工改过，没有覆盖。");
		console.log("确认要用包里的版本覆盖，加 --force 再跑一次。");
		break;
	case "source-missing":
		console.error(`找不到模板源文件：${outcome.source}`);
		process.exitCode = 1;
		break;
}

if (outcome.kind !== "source-missing") {
	const shadow = resolveShadowingLiteral(target);
	if (readFileExists(shadow)) {
		console.warn(`注意：${shadow} 存在。纯文本优先，会把模板顶掉，要生效请删掉它。`);
	}
}

function readFileExists(path: string): boolean {
	try {
		readFileSync(path);
		return true;
	} catch {
		return false;
	}
}

// 让打包器不要把未使用的 import 判成死代码
void writeFileSync;
