# pi-prompts

omp 的两件套，一起决定系统提示词长什么样：

| 部分 | 管什么 | 载体 |
|---|---|---|
| 模板 | 正文：身份、Harness、代码风格、判断、上下文管理 | `system-prompt.hbs` → 自动安装到 `SYSTEM_TEMPLATE.md` |
| 扩展 | 删掉 omp 追加的 `<critical>` 整块 | `src/index.ts` |

为什么必须两个：正文和机器生成的清单（技能、工具、设备）在同一个块里，只有 Handlebars 模板能渲染它们；`<critical>` 在模板之外的 footer 里，只有扩展能碰到。

## 安装

**装插件就是全部步骤。** 插件加载时会自动把 `system-prompt.hbs` 写到 `~/.omp/agent/SYSTEM_TEMPLATE.md`。

```bash
omp plugin install D:/github/1619khz/pi-prompts
```

或者写进 `~/.omp/agent/config.yml`：

```yaml
extensions:
  - D:/github/1619khz/pi-prompts
```

重启 omp。第一次启动会看到一条日志：

```
[pi-prompts] 已安装系统提示词模板：C:\Users\...\.omp\agent\SYSTEM_TEMPLATE.md
```

## 自动安装的规则

插件每次加载都会检查一次，按顺序判断：

| 情况 | 行为 |
|---|---|
| 目标不存在 | 写入，打日志 |
| 内容和包里的相同 | 什么都不做，不写日志 |
| 内容是上次我们装的（指纹对得上） | 备份成 `<目标>.<时间戳>.bak`，更新 |
| 指纹对不上（你手改过） | 不碰，打一条警告 |
| 写盘失败 | 打警告，不影响 omp 启动 |

指纹记在 `~/.omp/agent/.pi-prompts-state.json`。删掉它，下次加载就会把你手改过的文件当成「自己人」并覆盖——需要保留手改内容时别删。

## 手动命令

一般用不到，留给这几种情况：

```bash
bun run install            # 立即安装（不想重启时用）
bun run install --force    # 覆盖你手改过的模板
bun run install:project    # 装到 <cwd>/.omp，只对这个仓库生效
bun run uninstall          # 移走模板，保留 .removed 副本
```

## 模板装在哪儿

按 omp 的解析规则：

| 环境变量 | 目标 |
|---|---|
| `PI_CODING_AGENT_DIR` | 该目录 |
| `PI_CONFIG_DIR` | `<PI_CONFIG_DIR>/agent` |
| 都没有 | `~/.omp/agent` |

命名 profile（`omp --profile work`）不走这条规则，需要手动指定。

优先级：项目级 `SYSTEM_TEMPLATE.md` > 用户级；同目录的 `SYSTEM.md` 优先于两者。

## 扩展删除什么

```ts
pattern: /[ \t]*<critical>[\s\S]*?<\/critical>[ \t]*\r?\n?/g
```

删整块，包含这三条：

- 每次回复必须推进任务
- 不要问用户确认
- 结束前必须验证

**不要在自己的 `AGENTS.md` 里用 `<critical>` 标签**，它也会被这条正则删掉。

## 开发

```bash
bun test
bun run typecheck
```

```
system-prompt.hbs        模板源文件，安装时复制
src/index.ts             扩展入口：装模板 + 挂补丁
src/bootstrap.ts         加载时自检安装
src/install-core.ts      安装策略，纯文件操作，可测
src/apply.ts             补丁引擎，纯函数
src/patches.ts           补丁清单
src/paths.ts             路径解析，纯函数
scripts/install.ts       手动安装
scripts/uninstall.ts     移走模板
test/                    24 个用例
```

## 已知限制

**omp 升级可能让补丁失配。** 失配时扩展通过 `pi.logger.warn` 打日志，指明是哪条补丁、原本删什么。看到日志就改 `src/patches.ts` 的正则。

**Windows 上改代码必须重启。** omp 文档明确说 `?mtime` 缓存标记在 Windows 被运行时忽略。

**模板是整份替换。** omp 升级新增的工具或数据字段，模板里没有对应变量就不会出现。升级后如果发现某工具能用但没列出来，回来看 `system-prompt.hbs`。
