import { existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import {
	defaultEnv,
	defaultHome,
	resolveTemplateTarget,
	type Scope,
} from "../src/paths";

const args = new Set(process.argv.slice(2));
const scope: Scope = args.has("--project") ? "project" : "user";

const target = resolveTemplateTarget(scope, defaultEnv(), defaultHome(), process.cwd());

if (!existsSync(target)) {
	console.log(`没有找到已安装的模板：${target}`);
	process.exit(0);
}

// 不直接删：改名保留，误删可恢复
const parked = `${target}.removed`;
renameSync(target, parked);
console.log(`已移走：${target}`);
console.log(`保留了副本：${parked}`);
console.log("重启 omp 后回到内置默认提示词。");
