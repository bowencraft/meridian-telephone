---
id: "material-public-record-prop-docket"
type: "material"
title: "公共记录、离散电话与跨夜物证素材包"
category: "clue"
status: "outline"
source: "六章Seedline正文、Goal 2实施源与src/story/telephone.rules.json"
canonical: true
related_characters: ["char-evelyn-vale", "char-maeve-donnelly", "char-peter-ward", "char-leonard-campbell", "char-dorothy-haines", "char-alistair-wren"]
related_macguffins: []
plot_threads: ["plot-main", "plot-identity-recovery", "plot-independent-callers", "plot-meridian-containment"]
used_in_chapters: ["001.rain-question", "002.better-choice", "003.nineteenth-line", "004.lost-property-and-nocturne", "005.original-voice", "006.four-second-silence"]
created: "2026-07-21"
updated: "2026-07-21"
tags: ["场景物件", "离散电话", "新闻树", "跨夜后果", "三层检查"]
---
# 公共记录、离散电话与跨夜物证素材包

## Idea

把电话亭里的物件当成机构和人物留下的工作痕迹，而不是随机谜题。带号码的物件提供可选支线或人物回访；无号码物件用‘粗略识别—外观样式—详细意义’三层逐步交代世界规则。每件物品都能指出现实留下者、用途和权限边界，主线必要号码同时由固定通话交付，因此随机场景不会软锁流程。

带号码素材包括：医院交换便笺735 0194、道路卡946 0264、Meridian合同回执871 4000、Peter回访卡871 4227、VOICE故障回执871 4003/871 4019、Nocturne索引794 1966、创始组档案卡871 4036、4.0发布通知871 4127，以及Deptford旧诊所337 2181、Ashdown调查405 1979、地方分支互助台662 1904三条离散支线。形式覆盖手写便笺、公共服务卡、广告、碳复写回执、节目索引、海报、剪报与地方互助卡。

无号码素材包括：交班磁带与逐夜纸带、C.V.家门钥匙牌、公共路由研究组短章程、Peter夜班调整摘要、Leonard碳复写日志、19-C托管封套、MCE-0维护钥匙、Vale安全附录、安全签名穿孔卡和Maeve护士证套。它们分别承担跨夜记忆、私人动机、科研组织理想、员工现实利益、职业责任、双来源托管、本地能力边界、双签名规则、物理损坏后果和病人优先动机。

## Story Use

第一章让医院便笺、道路卡和Maeve证套把抽象分类落到Thomas的转运；第二章让公司广告与Peter工资摘要同场，形成制度承诺和个人代价的对照；第三章让故障回执与碳复写日志证明身份不是权限；第四章用托管封套、Nocturne索引和远程互锁凭条建立可验证的双来源；第五章用公共路由研究组章程、Vale安全附录和四段原声展示一个曾经由线路工程、语言接入、社区维护共同相信地方自治的团队；第六章让安全签名卡、发布通知和结局新闻回收前五章。

电话物件拨出后只承担一类主要职责：主线恢复、人物回访或离散世界支线。Deptford线由独立退休接待员讲述地方使用，Ashdown线补全Wren引用的事故背景，地方互助台让三名维护者分别表达需要兼容、拒绝中央层和寻找旧零件，避免所有陌生来电都是主角人格。

公共记录墙按优先级展示当前最新证据：基础试行新闻、Meridian续约、MCE-19合并、创始组历史，或上一复核案卷对应的七种后果新闻。新闻记录已经发生的历史，不随本轮即时改写。

## Notes

运行时三层字段固定为copy.summary、copy.style、copy.firstVariants/repeatVariants。summary只回答‘它是什么’，style只描述材质、磨损、印刷和留下方式，firstVariants解释它与人物、制度或暗线的关系；repeatVariants只在重看时压缩已知事实或强调后果。

现有33件物品分布在10个nightStart稳定槽位；新闻墙使用lastEnding和candidate priority选择最新公开记录。所有电话引用必须使用phoneDirectory的canonical id，871 4119、871 4027、871 4136仅作为号码alias归一，不额外制造剧情身份。

关键物品不能成为唯一入口。Maeve漏接会留下医院、道路号码和SC-441；各章early fallback会把玩家送回当前缺口。审计币在一次合法通话结束后只退一次；场景物件在通话期间锁定，避免重复触发状态。
