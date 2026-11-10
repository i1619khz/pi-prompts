import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { applyPatches } from "./apply";
import { bootstrapTemplate } from "./bootstrap";
import { PATCHES } from "./patches";

const LABEL = "pi-prompts";

/**
 * omp 扩展入口。
 *
 * 职责只有一件：在每次请求组装好系统提示词之后，把 omp 生成的那几段
 * 行为纪律删掉。
 *
 * 为什么必须用扩展：`before_agent_start` 的返回值是**完整替换**，
 * 而 `<project-context>` 那段是 omp 代码拼出来的，模板变量碰不到它。
 * 扩展拿到的是完整块数组，按文本改是唯一可行的位置。
 */
export default function piPrompts(pi: ExtensionAPI): void {
	pi.setLabel(LABEL);

	// 装插件即装模板，不需要再单独跑脚本
	bootstrapTemplate(pi);

	// 同一批补丁可能连续多次失配，只报第一次，避免刷屏
	const reported = new Set<string>();

	pi.on("before_agent_start", event => {
		const blocks = event.systemPrompt;

		// 空数组意味着替换等于清空整份提示词，必须直接放行
		if (blocks.length === 0) return;

		const result = applyPatches(blocks, PATCHES);

		for (const miss of result.misses) {
			if (reported.has(miss.id)) continue;
			reported.add(miss.id);
			pi.logger.warn(
				`[${LABEL}] 补丁 ${miss.id} 未匹配：${miss.description}。` +
					`omp 可能已升级并改了措辞，检查 src/patches.ts。`,
			);
		}

		if (!result.changed) return;
		return { systemPrompt: result.blocks };
	});
}
