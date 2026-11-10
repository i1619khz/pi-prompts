import type { Patch } from "./apply";

/**
 * 补丁清单。
 *
 * 只处理 omp 生成、模板改不到的内容——`<project-context>` 之后追加的
 * `<critical>` 整块。自己写的模板不在管辖范围内。
 *
 * 匹配写得比目标文本宽松：容忍缩进和 CRLF。失配不会静默，index.ts 会打警告。
 */
export const PATCHES: Patch[] = [
	{
		id: "drop-critical-block",
		description:
			"删掉 omp 追加的 <critical> 整块：每个回复必须推进任务、不要问确认、结束前必须验证",
		pattern: /[ \t]*<critical>[\s\S]*?<\/critical>[ \t]*\r?\n?/g,
		replacement: "",
	},
];
