---
id: "material-scene-prop-catalog"
type: "material"
title: "六章场景物件投放目录"
category: "research"
status: "outline"
source: "src/story/telephone.rules.json、src/game/types.ts与六章故事网络"
canonical: true
related_characters: ["char-evelyn-vale", "char-leonard-campbell", "char-alistair-wren", "char-peter-ward", "char-maeve-donnelly", "char-dorothy-haines"]
related_macguffins: []
plot_threads: ["plot-main", "plot-identity-recovery", "plot-independent-callers", "plot-meridian-containment"]
used_in_chapters: []
created: "2026-07-19"
updated: "2026-07-19"
tags: ["场景道具", "网页实现", "电话号码", "投放目录"]
---
# 六章场景物件投放目录

## Idea

按网页现有场景模型组织物件：每夜从wall或counter槽位稳定抽取，物件用printedLines显示表面文字，用firstVariants给首次详细检查，用repeatVariants给重看后的关系或暗线。phoneRefs非空的物件是可拨号入口，空数组物件只承担世界与人物信息。

| 物件 | 章节 | 形式 | 号码 | 留下者 | 主要用途 |
| --- | --- | --- | --- | --- | --- |
| 梅芙护士证套 | 1/5 | counter paper-card | 735 0194 | Maeve | 主动回拨、四秒外证 |
| Peter代表名片 | 2/5 | paper-card | 871 4227 | Peter | 人物支线、假代表 |
| 原声档案路由牌 | 4/5 | brass-plate | 871 4036 | Vale/Dorothy | 章节交接 |
| 广播路由明信片 | 4 | paper-card | 794 1966 | 普通听众 | 离散录音、提前总机号 |
| 医院交换便笺 | 1/3/5 | handwritten-note | 735 0194 | Maeve | 时间证据 |
| Peter工资袋 | 2/5 | counter docket | 无 | Peter/Meridian | 现实雇佣、人物代价 |
| Leonard维修日志 | 3/6 | booklet | 无 | Leonard | 四秒规则 |
| Dorothy认领袋 | 4/6 | counter ticket | 无 | Dorothy/Vale | 外证门槛 |
| Vale训练改稿 | 2/5 | booklet | 无 | Vale/Wren | 参与与反抗 |

## Story Use

第一章至少出现一个公共号码物件和一个生活物件；第二章让公司名片与工资袋同场，区分品牌说法和员工现实；第三章以日志、回执、钟差替代更多广告；第四章用认领袋、黄铜路由牌、听众明信片形成两条物证故事；第五章让旧物根据人物状态出现不同repeatVariants；第六章只回收已见物件，不新增钥匙。

带号码物件的拨号结果分三类：主章入口、人物支线、离散录音。每个号码只属于一类主要职责。无号码物件的检查层级固定为‘它是什么—上面可见什么—这说明了谁或什么’，避免把详细信息写成百科条目。

## Notes

- 现有可用kind为paper-card、classified-ad、poster、brass-plate、newspaper、booklet、ticket、sticker、handwritten-note；本批素材不要求新增渲染类型。
- counter层现有counterStyle为night-ticket、meridian-matches、locker-key、operator-docket；护士证与认领袋复用night-ticket，工资袋复用operator-docket。
- 主线号码必须另有非随机口述或固定节点交付，spawnChance不能阻断章节。
- 有号码物件的phoneRefs必须引用globals.phone.directory中已存在的id；新增三个目录id为hospital-night-exchange、meridian-representative-227、meridian-voice-archive。
- 粗略label保持名词性短语；printedLines最多三行；firstVariants一至三句；repeatVariants一句且尽量响应人物状态。
- 同一夜的物件选择保持nightStart稳定，玩家刷新页面不能刷出关键线索。
