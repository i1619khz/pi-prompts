import { homedir } from "node:os";
import { join } from "node:path";

/** omp 解析配置目录时看的环境变量子集。抽成参数，方便测试。 */
export interface PathEnv {
	PI_CODING_AGENT_DIR?: string;
	PI_CONFIG_DIR?: string;
}

export type Scope = "user" | "project";

/**
 * 用户级 agent 目录，和 omp 的解析规则一致：
 *
 * 1. `PI_CODING_AGENT_DIR` 直接指定整个 agent 目录（仅默认 profile 生效）
 * 2. `PI_CONFIG_DIR` 替换配置根目录，agent 目录是它的 `agent/` 子目录
 * 3. 都没有 -> `~/.omp/agent`
 *
 * 命名 profile（`omp --profile work`）不在这里处理：那条路走
 * `~/.omp/profiles/<name>/agent`，安装时应显式传 --profile 目录。
 */
export function resolveAgentDir(env: PathEnv, home: string): string {
	if (env.PI_CODING_AGENT_DIR) return env.PI_CODING_AGENT_DIR;
	if (env.PI_CONFIG_DIR) return join(env.PI_CONFIG_DIR, "agent");
	return join(home, ".omp", "agent");
}

/** 安装目标：用户级写 agent 目录，项目级写 `<cwd>/.omp/`。 */
export function resolveTemplateTarget(scope: Scope, env: PathEnv, home: string, cwd: string): string {
	const base = scope === "project" ? join(cwd, ".omp") : resolveAgentDir(env, home);
	return join(base, "SYSTEM_TEMPLATE.md");
}

/** 同目录的纯文本替代文件。它存在时优先级更高，会把模板顶掉。 */
export function resolveShadowingLiteral(target: string): string {
	return join(target, "..", "SYSTEM.md");
}

export const defaultEnv = (): PathEnv => ({
	PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR,
	PI_CONFIG_DIR: process.env.PI_CONFIG_DIR,
});

export const defaultHome = (): string => homedir();
