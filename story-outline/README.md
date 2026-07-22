---
id: storyline-refactor-readme
type: documentation
title: "电话亭完整互动叙事工作区"
status: draft
created: 2026-07-19
updated: 2026-07-23
tags: ["导航", "故事大纲", "Telephone"]
---
# 电话亭完整互动叙事工作区

这里保存《Telephone》重构后的故事背景、人物、素材、中央剧情、号码驱动的六章网络，以及从拨号者第二人称视角写成的完整正文初稿。六章正文覆盖连续夜班、多周目记忆、人物分支和七个互斥结局；当前Markdown是叙事规范来源，尚未迁移进游戏运行数据。

## Active Deployment Boundary — 2026-07-23

当前网页游戏已经恢复为远端部署版：40个节点、74条边、8个有效号码、3个主动来电、6件墙面物件、4件柜台物件和7个结局。这个运行时版本是公开 Wiki 的最高正史。

本目录的Seedline六章、具名人物、额外号码和33件场景材料是对活动版本的长篇扩写，不再声称已经进入当前网页。它们可以作为不冲突的幕后背景和未来开发记录继续保留；在 Quartz 网站中统一显示 `[网页未实装]`。当前可拨号码与场景物件以 `src/story/telephone.rules.json`、`src/game/boothItems.ts` 为准。

## One-Sentence Story

1989年的伦敦雨夜，Evelyn Vale被隔离的工作自我从一场医院转运错误追查到自己参与创造的Seedline，并必须在凌晨版本同步前决定谁有权管理一个已经扩散的公共通信工具。

## Recommended Reading Order

1. [`TASKS.md`](TASKS.md)：两阶段长线目标、执行顺序、验收条件、分支与提交策略。
2. [`project.md`](project.md)：故事承诺、核心问题和清晰度原则。
3. [`world/meridian-rain-exchange.md`](world/meridian-rain-exchange.md)：1989年伦敦、Seedline、记忆分区、MCE-0与世界规则。
4. [`characters/`](characters/)：六名核心人物及其独立目标。
5. [`materials/`](materials/)：母题、线索与可映射到网页字段的场景物件；总目录见[`scene-prop-catalog.md`](materials/scene-prop-catalog.md)。
6. [`plot/000.master-plot.md`](plot/000.master-plot.md)：中央剧情、隐藏真相时间线、七结局与铺垫回收。
7. [`outlines/000.master-outline.md`](outlines/000.master-outline.md)：六夜因果总纲与人物状态轨道。
8. [`outlines/010.chapter-number-network.md`](outlines/010.chapter-number-network.md)：主线号码、人物支线、恢复路径与章末交接。
9. [`outlines/011.chapter-01-rain-question.md`](outlines/011.chapter-01-rain-question.md)至[`outlines/016.chapter-06-four-second-silence.md`](outlines/016.chapter-06-four-second-silence.md)：六章的现实任务、选择、人物后果和章末合同。
10. [`outlines/020.reveal-ledger.md`](outlines/020.reveal-ledger.md)：各章读者知道、误读和仍待回答的内容。
11. [`outlines/040.manuscript-reader-audit.md`](outlines/040.manuscript-reader-audit.md)：六章读者理解、技术边界、人物独立性与七结局公平性审计。
12. [`outlines/050.institutional-revision-direction.md`](outlines/050.institutional-revision-direction.md)至[`outlines/055.subagent-blind-draft-audit.md`](outlines/055.subagent-blind-draft-audit.md)：重构方向、基线、三轮分章审计与只看正文的全书盲读。
13. [`chapters/001.rain-question.md`](chapters/001.rain-question.md)至[`chapters/006.four-second-silence.md`](chapters/006.four-second-silence.md)：已经按新框架完成的六章第二人称正文与七结局。
14. [`implementation/060.game-data-execution-plan.md`](implementation/060.game-data-execution-plan.md)至[`implementation/064.alias-fallback-contract.md`](implementation/064.alias-fallback-contract.md)：Goal 2的节点执行、电话分支、公开记录、跨周目状态与防死路实施契约。

## Canon At A Glance

- 主角是Evelyn Vale被工作记忆分区隔离的夜班自我，与私人自我共用同一具身体。
- Seedline是原公共研究组创造的模块化电话路由工具，没有意识，也不能改变外部事实。
- Meridian把礼仪话术、绩效分类和记忆分区绑定；它依靠组织权力，不靠一句话瞬间控制普通人。
- MCE-0磁带只保存声学检索钥匙与口述交班，记忆仍在Vale同一大脑中；每次重开是后续夜班。
- 最终行动围绕Wren运营签名、Vale安全签名、凌晨同步、外部托管与地方分支治理。

## Contents

| Layer | Current Content |
| --- | --- |
| World | 1份整体世界与规则设定 |
| Characters | 6名核心人物 |
| Materials | 22项母题、线索、物件、号码入口、交班机制与故事账本 |
| Plot | 1条中央剧情、3条支线 |
| Outline | 六夜总纲、号码网络、6份分章合同、揭示账本、正文控制框架、重构方向、读者审计与分章Sub-agent审计 |
| Chapters | 6章新版正文；包括跨夜失败、人物分支、四段创始史和7个互斥结局 |
| Implementation | 5份游戏数据实施源：节点、电话图、新闻广播、长期状态、alias/fallback |

## Current Boundary

世界规则、核心人物、中央剧情、六夜正文、故事账本、材料来源与读者审计仍作为完整扩写稿保存。此前向游戏数据迁移的Seedline实现已被远端部署版恢复覆盖，因此相应实施文档现为开发记录，不代表当前可玩数据。Quartz手册先以活动JSON建立人物声音、电话、物件、分支和结局Wiki，再把本目录其余内容作为带`[网页未实装]`标记的幕后档案与网页小说呈现。

## Workspace Rules

- Markdown与YAML frontmatter是本目录的规范来源。
- `published/`只用于未来生成内容，不是可编辑源文件。
- 新人物、素材和剧情必须引用稳定ID，并遵守 [`AGENTS.md`](AGENTS.md)。
- 任何新增概念都必须先通过人物行动、通话后果或实体物件展示。
