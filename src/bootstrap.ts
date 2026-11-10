import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { resolve } from "node:path";
import { installTemplate } from "./install-core";
import { defaultEnv, defaultHome, resolveTemplateTarget } from "./paths";

/** 包里的模板源文件。插件装在别处时，路径跟着插件走。 */
export function templateSource(): string {
	return resolve(import.meta.dir, "..", "system-prompt.hbs");
}

/**
 * 插件加载时自检并安装模板。
 *
 * 为什么放在这里：用户装插件就希望一步到位，不想再单独跑一个脚本。
 * 写入发生在扩展工厂执行期间，早于第一次请求组装，所以本次启动就能用上。
 *
 * 任何异常都不许冒泡——模板装不上不该让 omp 起不来。
 */
export function bootstrapTemplate(pi: ExtensionAPI): void {
	try {
		const target = resolveTemplateTarget("user", defaultEnv(), defaultHome(), process.cwd());
		const outcome = installTemplate({ source: templateSource(), target });

		switch (outcome.kind) {
			case "created":
				pi.logger.warn(`[pi-prompts] 已安装系统提示词模板：${target}`);
				break;
			case "updated":
				pi.logger.warn(`[pi-prompts] 模板已更新，旧版备份在 ${outcome.backup}`);
				break;
			case "user-edited":
				pi.logger.warn(
					`[pi-prompts] ${target} 被手工改过，没有覆盖。` +
						`要恢复内置模板，执行 bun run install --force。`,
				);
				break;
			case "source-missing":
				pi.logger.warn(`[pi-prompts] 找不到模板源文件：${outcome.source}`);
				break;
			case "up-to-date":
				break;
		}
	} catch (error) {
		pi.logger.warn(`[pi-prompts] 模板安装失败：${String(error)}`);
	}
}
