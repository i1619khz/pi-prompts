import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type InstallOutcome =
	| { kind: "created" }
	| { kind: "up-to-date" }
	| { kind: "updated"; backup: string }
	| { kind: "user-edited" }
	| { kind: "source-missing"; source: string };

export interface InstallRequest {
	/** 包里的模板源文件 */
	source: string;
	/** 安装目标 SYSTEM_TEMPLATE.md */
	target: string;
	/** 用户明确要求覆盖手改内容时传 true */
	force?: boolean;
	/** 测试注入用 */
	now?: Date;
}

const sha = (text: string): string => createHash("sha256").update(text).digest("hex");

/** 记录「上次由我们安装的内容」的指纹，用来区分「旧版本」和「用户手改」。 */
export function stateFileFor(target: string): string {
	return join(dirname(target), ".pi-prompts-state.json");
}

interface State {
	hash: string;
	target: string;
	installedAt: string;
}

function readState(target: string): State | undefined {
	const path = stateFileFor(target);
	if (!existsSync(path)) return undefined;
	try {
		const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
		if (typeof parsed === "object" && parsed !== null && "hash" in parsed) {
			const hash = parsed.hash;
			if (typeof hash === "string") return { hash, target, installedAt: "" };
		}
	} catch {
		// 状态文件坏了就当没有，后面按「用户手改」处理，不会误覆盖
	}
	return undefined;
}

function writeState(target: string, hash: string, now: Date): void {
	const state: State = { hash, target, installedAt: now.toISOString() };
	const path = stateFileFor(target);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(state, null, "\t")}\n`, "utf8");
}

/**
 * 把模板装到目标位置。
 *
 * 覆盖策略，按顺序判断：
 * 1. 目标不存在 -> 写入
 * 2. 内容相同 -> 什么都不做
 * 3. 内容是上次我们装的（指纹对得上）-> 备份后升级
 * 4. 指纹对不上（用户手改过）-> 不碰，交给调用方提示
 */
export function installTemplate(req: InstallRequest): InstallOutcome {
	if (!existsSync(req.source)) return { kind: "source-missing", source: req.source };

	const desired = readFileSync(req.source, "utf8");
	const desiredHash = sha(desired);
	const now = req.now ?? new Date();

	if (!existsSync(req.target)) {
		mkdirSync(dirname(req.target), { recursive: true });
		writeFileSync(req.target, desired, "utf8");
		writeState(req.target, desiredHash, now);
		verifyReadBack(req.target, desired);
		return { kind: "created" };
	}

	const current = readFileSync(req.target, "utf8");
	if (current === desired) {
		writeState(req.target, desiredHash, now);
		return { kind: "up-to-date" };
	}

	const fromUs = readState(req.target)?.hash === sha(current);
	if (!fromUs && !req.force) return { kind: "user-edited" };

	const stamp = now.toISOString().replace(/[:.]/g, "-");
	const backup = `${req.target}.${stamp}.bak`;
	renameSync(req.target, backup);
	writeFileSync(req.target, desired, "utf8");
	writeState(req.target, desiredHash, now);
	verifyReadBack(req.target, desired);
	return { kind: "updated", backup };
}

/** 写完立刻回读，确认落盘内容和源文件一致。 */
function verifyReadBack(target: string, desired: string): void {
	if (readFileSync(target, "utf8") !== desired) {
		throw new Error(`写入校验失败：${target} 的内容与源文件不一致`);
	}
}
