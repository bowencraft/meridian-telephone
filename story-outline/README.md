---
id: storyline-refactor-readme
type: documentation
title: "电话亭完整互动叙事工作区"
status: draft
created: 2026-07-19
updated: 2026-07-20
tags: ["导航", "故事大纲", "Telephone"]
---
# 电话亭完整互动叙事工作区

这里保存《Telephone》重构后的故事背景、人物、素材、中央剧情、号码驱动的六章网络，以及从拨号者第二人称视角写成的完整正文初稿。六章正文覆盖连续夜班、多周目记忆、人物分支和七个互斥结局；当前Markdown是叙事规范来源，尚未迁移进游戏运行数据。

## One-Sentence Story

1968年的伦敦雨夜，一个没有姓名的人在一座不存在于地图上的电话亭里追查异常来电，最终发现自己是被Meridian删除的十九号接线员Evelyn Vale，并必须决定如何处理自己曾参与创造的身份改写系统。

## Recommended Reading Order

1. [`project.md`](project.md)：故事承诺、核心问题和清晰度原则。
2. [`world/meridian-rain-exchange.md`](world/meridian-rain-exchange.md)：1968年伦敦、Meridian、电话亭与世界规则。
3. [`characters/`](characters/)：六名核心人物及其独立目标。
4. [`materials/`](materials/)：母题、线索与可映射到网页字段的场景物件；总目录见[`scene-prop-catalog.md`](materials/scene-prop-catalog.md)。
5. [`plot/000.master-plot.md`](plot/000.master-plot.md)：中央剧情、三幕推进、七结局与铺垫回收。
6. [`outlines/000.master-outline.md`](outlines/000.master-outline.md)：六章总纲、非线性汇流规则和现有节点迁移表。
7. [`outlines/010.chapter-number-network.md`](outlines/010.chapter-number-network.md)：主线号码脊柱、人物支线号码、重玩规则与网页映射。
8. [`outlines/011.chapter-01-rain-question.md`](outlines/011.chapter-01-rain-question.md)至[`outlines/016.chapter-06-four-second-silence.md`](outlines/016.chapter-06-four-second-silence.md)：六章的入口、选择、道具、人物后果和章末交接合同。
9. [`outlines/020.reveal-ledger.md`](outlines/020.reveal-ledger.md)：各章玩家知道、误读和仍待回答的内容。
10. [`chapters/001.rain-question.md`](chapters/001.rain-question.md)至[`chapters/006.four-second-silence.md`](chapters/006.four-second-silence.md)：完整六章正文初稿；第六章含七个互斥结局。
11. [`materials/000.story-ledger.md`](materials/000.story-ledger.md)与[`outlines/040.manuscript-reader-audit.md`](outlines/040.manuscript-reader-audit.md)：正文后的连续性账本与读者理解审计。

## Canon At A Glance

- 主角是Evelyn Vale，曾参与设计礼仪协议，后来反抗并被删除。
- Meridian是由人和自动设备维持的现实机构，不是超自然意识。
- 大多数来电者都是独立人物；只有明确标记的旧录音和自我转接属于Vale回声。
- 礼仪协议通过倾听、重复话术和多次接触逐步生效，不能瞬间控制人。
- 最终行动依赖正式投诉、四秒人工窗口、公用电话钥匙和已建立的人物关系。

## Contents

| Layer | Current Content |
| --- | --- |
| World | 1份整体世界与规则设定 |
| Characters | 6名核心人物 |
| Materials | 22项母题、线索、物件、号码入口、交班机制与故事账本 |
| Plot | 1条中央剧情、3条支线 |
| Outline | 1份六章总纲、1份号码网络、6份分章合同、1份揭示账本、1份正文控制框架、1份读者审计 |
| Chapters | 6章正文初稿，包含连续夜班、多分支与7个互斥结局 |

## Current Boundary

六章故事正文已经完成并通过严格连续性检查；当前边界停在叙事源文件，不改动`src/story/telephone.rules.json`。后续实现可以依据分章合同与正文，把号码、选择、跨夜人物状态、永久物件后果和七个互斥结局迁移成可执行节点。场景素材已经标出`kind`、`layer`、`counterStyle`、`phoneRefs`和检查文本层级，可直接转成`extensions.telephone.scene`数据。

## Workspace Rules

- Markdown与YAML frontmatter是本目录的规范来源。
- `published/`只用于未来生成内容，不是可编辑源文件。
- 新人物、素材和剧情必须引用稳定ID，并遵守 [`AGENTS.md`](AGENTS.md)。
- 任何新增概念都必须先通过人物行动、通话后果或实体物件展示。
