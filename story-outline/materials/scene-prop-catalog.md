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
updated: "2026-07-21"
tags: ["场景道具", "网页实现", "电话号码", "投放目录"]
---
# 六章场景物件投放目录

## Idea

按网页现有场景模型组织物件：每夜从wall或counter槽位稳定抽取，物件用printedLines显示表面文字，用firstVariants给首次详细检查，用repeatVariants给重看后的关系或暗线。phoneRefs非空的物件是可拨号入口，空数组物件只承担世界与人物信息。

| 物件 | 章节 | 形式 | 号码 | 留下者 | 主要用途 |
| --- | --- | --- | --- | --- | --- |
| 医院交换便笺 | 1/3/5 | handwritten-note | 735 0194 | Maeve | 回拨、零点五十二分现场时间 |
| 道路分类回执 | 1/2/6 | ticket | 871 4000 | Meridian合同组 | 中央状态与原始附件冲突 |
| Peter内部回访卡 | 2/5 | paper-card | 871 4227 | Peter | 人物回访与一次性队列码来源 |
| 夜班调整摘要 | 2/5/6 | counter docket | 无 | Peter/Meridian | 津贴、照护补贴、纪律点与调查后果 |
| MCE-19故障回执 | 3/4 | ticket | 871 4003 | Leonard | 工作身份与外部来源栏 |
| Leonard碳复写日志 | 3/4/6 | booklet | 无 | Leonard | 四秒窗、封条和技术签字 |
| Radio Nocturne索引卡 | 4 | paper-card | 794 1966 | 社区广播档案员 | 公开时间戳与地方分支支线 |
| 19-C安全托管封套 | 4/6 | counter ticket | 无 | Dorothy/Vale | 双来源门槛和签名外部副本 |
| 创始人原声路由卡 | 4/5 | paper-card | 871 4036 | Vale/Dorothy | 章节交接与固定历史录音 |
| MCE-0维护钥匙 | 4/5 | ticket + locker-key | 无 | Vale托管安排 | 只打开本地语音柜 |
| Vale安全附录 | 5/6 | booklet | 无 | Vale/Wren/Leonard | 早期妥协与签名权限边界 |
| 安全签名穿孔卡 | 4/6 | ticket | 无 | Vale/Dorothy | 发布、撤销、附加条件或号码磨损 |
| 交班磁带与纸带 | 全章 | counter docket | 无 | Vale | 声学检索、口述交班与跨夜后果 |

## Story Use

第一章至少出现一个公共号码物件和一个医院工作物件；第二章让公司回访卡与调整摘要同场，区分品牌说法和员工现实；第三章以日志、回执和预约卡建立身份；第四章用托管封套、广播索引和预置维护匣形成双来源；第五章让旧物根据人物状态出现不同repeatVariants；第六章只回收已见物件，不新增万能设备。

带号码物件的拨号结果分三类：主章入口、人物支线、离散录音。每个号码只属于一类主要职责。无号码物件的检查层级固定为‘它是什么—上面可见什么—这说明了谁或什么’，避免把详细信息写成百科条目。

## Notes

- 现有可用kind为paper-card、classified-ad、poster、brass-plate、newspaper、booklet、ticket、sticker、handwritten-note；本批素材不要求新增渲染类型。
- counter层现有counterStyle为night-ticket、meridian-matches、locker-key、operator-docket；护士证与认领袋复用night-ticket，工资袋复用operator-docket。
- 主线号码必须另有非随机口述或固定节点交付，spawnChance不能阻断章节。
- 有号码物件的phoneRefs必须引用globals.phone.directory中已存在或在Goal 2实施源明确定义的id；主线号码仍须有固定口述或工单来源。
- 粗略label保持名词性短语；printedLines最多三行；firstVariants一至三句；repeatVariants一句且尽量响应人物状态。
- 同一夜的物件选择保持nightStart稳定，玩家刷新页面不能刷出关键线索。
