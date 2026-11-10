/**
 * 补丁引擎：纯函数，不依赖 omp 运行时，方便单独测试。
 */

export interface Patch {
	/** 稳定标识，失配时用它在日志里指认是哪条补丁坏了 */
	id: string;
	/** 这条补丁在删什么，失配时报给人看 */
	description: string;
	/** 要匹配的文本。必须带 g 标志，否则只替换第一处 */
	pattern: RegExp;
	/** 替换成什么。删整行时给空串 */
	replacement: string;
}

export interface ApplyResult {
	/** 处理后的块数组。没有补丁命中时与输入内容相同 */
	blocks: string[];
	/** 一个块都没匹配上的补丁 */
	misses: Patch[];
	/** 是否真的改动了内容。没改动时调用方不必返回新数组 */
	changed: boolean;
}

/**
 * 把补丁逐条应用到块数组上。
 *
 * 块的顺序和数量不会变——只在块内部做文本替换。这样提示词的缓存前缀
 * 保持稳定，也避免误伤 omp 生成的其他内容。
 */
export function applyPatches(blocks: string[], patches: Patch[]): ApplyResult {
	const misses: Patch[] = [];
	const next: string[] = [];
	let changed = false;

	for (const block of blocks) {
		let text = block;

		for (const patch of patches) {
			// String.replace 对带 g 的正则每次都从头扫，不受上一次调用的 lastIndex 影响
			const replaced = text.replace(patch.pattern, patch.replacement);
			if (replaced !== text) text = replaced;
		}

		if (text !== block) changed = true;
		next.push(text);
	}

	// 判断哪些补丁一个块都没命中
	for (const patch of patches) {
		const hit = blocks.some(block => block !== block.replace(patch.pattern, patch.replacement));
		if (!hit) misses.push(patch);
	}

	return { blocks: next, misses, changed };
}
