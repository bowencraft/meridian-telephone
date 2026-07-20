---
id: telephone-long-running-task-charter
type: documentation
title: "Telephone长线重构与游戏数据实施任务书"
status: draft
created: 2026-07-21
updated: 2026-07-21
tags: ["任务书", "目标", "提交", "游戏数据", "盲测"]
---
# Telephone长线重构与游戏数据实施任务书

本文件记录作者在2026-07-21布置的全部连续任务、执行顺序和完成标准。发生上下文压缩时，应先读取本文件、`project.md`、当前活动目标和最近一次Git提交，再继续工作。

## Author Direction

- 不受旧版 `src/story/telephone.rules.json` 的人物、剧情与设定约束；先把框架、世界观、人物和六章正文改好。
- 整体气质接近制度化职场科技悬疑：日常流程、绩效、合规语言与部门边界逐步显出恐怖后果。
- 科研组织具有理想主义工具创造者面对失控遗产的感觉：技术可复制、可分支、能造福地方机构，也会被垄断或扩散错误。
- 灵感只用于体验和结构，不复制参考作品的角色、情节或专有设定。
- 一直工作直到故事重构、游戏数据迁移、物品场景和盲测迭代全部完成。

## Goal 0 — Baseline Commit

Status: completed.

- 在 `codex/storyline-refactor` 分支提交上一版六章故事与大纲。
- Commit: `0f422ff docs: add complete telephone narrative draft`
- 未把原有未跟踪的 `docs/BAOTA_DEPLOYMENT_GUIDE.md` 与 `scripts/` 混入提交。

## Goal 1 — Six-Chapter Narrative Reconstruction

Status: completed. 六章正文已通过严格连续性检查、分章审计、全书盲读与定点复核；完成提交 `a020bbb docs: rewrite six-chapter Seedline narrative`。

### Objective

整体重构前六章的框架、设定、人物与正文，解决以下问题：

1. 剧情过于晦涩，当前目标、直接风险或术语用途不清楚。
2. 细节不合理，尤其是技术能力、身体与记忆连续性、机构权限和职业行为。
3. 转折依赖巧合递送，前后因果拼凑，章间衔接不流畅。
4. 护士、主管、员工、工程师与档案人员缺少现实利益和可辨认的行为方式。
5. Meridian、分区、跨夜重开、主角身份和最终操作等设定含糊。

### Required Sequence

1. 审计旧六章。
2. 重写世界规则和隐藏真相时间线。
3. 重写六名核心人物的职业、欲望、恐惧、利益和合作条件。
4. 重写中央剧情、六章因果链、号码交接与读者理解路径。
5. 逐章重写六章正文。
6. 更新故事账本、材料来源和读者理解审计。
7. 运行结构、语义、清晰度与连续性检查。
8. 让只读Sub-agent评估清晰度、合理性、动机、衔接、制度悬疑和科研组织感；根据问题继续修改。
9. 提交第一目标成果。

### Acceptance Criteria

- 每章开场能在短场景内明确：谁在通话、对方要什么、Vale当前要做什么、失败会怎样。
- 每章只承担一个主要设定更新和一个主要剧情问题。
- 每个主线号码都有现实工作流程来源与非随机交付路径。
- 重要人物至少有一项帮助主角的自身利益、一项拒绝主角的现实风险、一项可观察行为习惯。
- Wren的方案提供真实公共安全或员工福利收益，同时明确锁定治理权。
- Seedline、礼仪层、工作记忆分区、MCE-0交班和四秒窗口都有能力边界、成本与可见证据。
- “重新开始”明确是后续夜班；人物、机构、物件和关系后果延续。
- 六章因果遵循“上一选择造成后果，后果提供下一行动条件”，不靠突然告知。
- 七个结局互斥，全部由已建立证据、权限、人物关系与版本规则触发。
- 严格连续性检查为0错误、0警告；Sub-agent不再报告阻断流程的理解问题。

### Commit Policy

- 世界观、人物与剧情控制层完成后可做一次框架提交。
- 六章正文与账本全部完成并通过检查后做第一目标完成提交。

## Goal 2 — Game Story Data Migration And Completion

Status: active. 系统目标已创建，当前在 `codex/seedline-game-data` 分支实施。

### Objective

把通过验收的六章故事分章节迁移进电话游戏的唯一规则数据，使玩家可以通过拨号、选择、来电、场景检查和跨夜档案顺畅抵达不同分支与七个结局。

### Required Sequence

1. 从第一目标完成提交创建新的游戏数据实施分支。
2. 读取当前类型、校验器、状态机、持久化、后台编辑能力与现有测试。
3. 先写Markdown实施源：
   - 章节到节点的执行大纲；
   - 主线与人物电话分支图；
   - 新闻、广播与公开记录树；
   - 跨夜flags、线索、关系和结局状态表；
   - 号码、alias、fallback与错误拨号策略。
4. 依据实施源迁移 `src/story/telephone.rules.json`，先完成六章主干和七结局。
5. 补齐详细分支、节点variants、号码alias、fallbackVariants、超时、挂断与不可达保护。
6. 更新或增加验证器与自动化测试，覆盖必达主线、互斥结局、跨夜记忆和无死路回退。
7. 设定物品、电话簿、新闻/广播材料与概率场景信息，包括无号码物件的粗略、样式和详细检查层。
8. 运行JSON验证、单元测试、lint、build与图可达性审计。
9. 召唤不知道具体设定的Sub-agent，从空档案开始盲玩；要求其尝试不同策略和多个结局。
10. 根据盲测继续修改剧情结构、设定、文本、描摹、选择、分支、alias、fallback和场景信息，直到Sub-agent能顺畅完成不同结局。
11. 提交最终游戏数据成果。

### Acceptance Criteria

- 六章主线均可由玩家操作抵达，章末通过获得或拨打下一号码交接。
- 七个结局均可从合法状态抵达，互斥条件明确，至少三个结局由不同玩法或关系条件区分。
- 主线必要号码不会只依赖随机物品；遗漏物品或挂断后仍有合理恢复路径。
- 所有有效号码有电话簿条目或清楚的发现来源；常见格式变体由alias处理。
- 每个重要节点有足够variants减少重复感，并有语义一致的fallback。
- 新闻树、广播树和物件检查提供世界暗线，不承担单一不可替代的主线钥匙。
- 有电话号码的物件能触发离散支线；无号码物件具有粗略信息、样式描述和详细信息三层。
- 新周目保留作者指定的号码、线索、人物后果和结局记忆；临时权限正确清零。
- 校验、测试、lint与build通过；盲测Sub-agent能够从零理解目标并抵达多个不同结局。

### Commit And Branch Policy

- Goal 1在 `codex/storyline-refactor` 完成。
- Goal 2从Goal 1完成提交创建新的、名称清楚的实现分支。
- 适合提交的节点包括：实施大纲、主干JSON、详细分支、场景物品、盲测修复与最终验收。
- 每次提交只包含本任务相关文件，不混入既有无关改动。

## Current Work State

- Current branch: `codex/seedline-game-data`
- Active system goal: Goal 2 — 游戏规则数据迁移、扩写、验证与盲玩
- Completed Goal 2 commits: `32b932f docs: define Seedline game data migration`; `0bba5e0 feat: add replay-safe story graph primitives`; `6549455 feat: migrate six-chapter Seedline call graph`。
- Current milestone: 六章主干、七结局、14个电话条目、100个节点、246条边、33件场景材料、10个场景点位与3个来电事件已写入 `src/story/telephone.rules.json`；37个节点有等价复访variants，54个节点有明确fallback。
- Current verification: JSON可解析；规则校验0错误/0警告；15个测试文件73项全过，lint、生产构建与diff检查通过。路线测试已从同一六章证据链分别达成七结局，并覆盖磨损后三方修复、重复磨损不复用旧凭据、conditional签名重开、Maeve弱证据补强与跨周目改选结局。浏览器实测已修复第一章确认按钮假自环、柜台物件被电话机遮挡，以及末声铃附近接听与漏接计时器的竞态；alias现会显示规范号码转接提示，验证器强制所有非结局通话使用无条件`call` timeout安全返回待机。
- Independent review: 分支韧性Sub-agent遍历101,199个可达状态，确认七结局、错号、无效选择、超时、挂断、漏接、弱证据与多周目均无软锁。最终玩家可见文本复审为0项阻断、0项主要问题；六项评分依次为易懂性8.8、人物动机9.2、转折衔接9.1、设定明确9.0、制度职场科幻悬疑9.4、科研组织理想与遗产感9.2。此前指出的随机variant拆分核心事实与Clara私人承诺未结清均已修正。
- Blind UI playtest: 第一轮误载旧覆盖的结果已作废。第二轮从真正空白的Seedline档案走完六章，并取得《夜班接线员》《入职》《天气很好》；章节号码链、人物动机、记忆机制、Clara私人目标和跨周目后果均通过。其操作总评仍为FAIL，剩余问题是30ms键入的可见反馈、漏接提示、持币时来电抢占、跨案卷投币文案与Wren整合追问。现已让键盘数字立即登记、加入独立拨号缓冲；盲测者同样的浏览器级30ms输入`1234567`在300ms后实测完整显示并进入CONNECTING。漏接将显示恢复卡，持币或已有信用时不启动来电，文案改为“本轮”，Wren追问新增独立条款回答节点。
- Material sources: `materials/public-record-prop-docket.md` 已记录电话物件、无号码三层检查、离散支线、七类后果新闻与场景约束；`materials/scene-prop-catalog.md` 已同步。
- Next work: 完成第三轮定点修复的真实浏览器复核、全量测试与提交；随后让盲测Sub-agent只复测30ms快速拨号、漏接恢复、持币来电、投币文案和Wren条款回答。取得最终PASS后更新本记录、最终提交并完成目标。
