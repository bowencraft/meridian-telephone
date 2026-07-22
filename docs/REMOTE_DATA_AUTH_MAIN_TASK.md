# 远端数据回归、服务端鉴权与 main 收口

状态：进行中

基准日期：2026-07-23
工作分支：`codex/seedline-game-data`

## 目标

1. 以 `2c2g:/www/wwwroot/05-telephone` 当前部署内容为唯一数据基准，恢复本地活动故事数据。
2. 场景只保留远端实际存在的物件；每一件在每次进入场景时都必须出现，不能仅做到“点位有物件的概率为 100%”。
3. 后台密码、摘要和可复用认证凭据不得进入浏览器 bundle 或 Web Storage；密码验证、会话签发和受保护写入必须由服务器完成。
4. 完成自动化测试、生产构建和独立子代理审查后，按清晰边界提交，并安全更新本地 `main`。

## 已核验的远端基线

- 活动故事文件：`src/story/telephone.rules.json`
- SHA-256：`45b5a4000d8d7f1d711e8e1b67e0bc471f4bf036415b0d0150845398a8259de9`
- 图规模：40 个节点、74 条边
- 六件墙面/场景交互物：
  - `weather-card`
  - `meridian-ad`
  - `scratched-plate`
  - `newspaper`
  - `phonebook`
  - `coin-return`
- 四件置物台物件保持远端定义：`night-ticket`、`meridian-matches`、`locker-key`、`operator-docket`。
- 远端生产入口目前是宝塔 Nginx 反向代理到 `vite preview :5184`；这不能提供真正的服务端鉴权，因此仓库需要提供可替代 preview 的生产服务入口。

## 实施顺序与验收

### A. 数据与场景回归

- [x] 本地故事源文件与远端基线逐字节一致。
- [x] v1 数据迁移后生成远端六件热点物品和四件台面物品，共十个独立点位。
- [x] 十个点位均为单候选、无条件、`spawnChance: 1`；跨 100 个 seed 验证十件物品每次全部出现。
- [x] 置物台四件物品的标签与描述恢复为远端版本。
- [x] 不引入任何 Seedline 场景物品；Storytelling 文档保留为未来创作资料，但不再驱动当前活动游戏数据。

### B. 服务端鉴权

- [ ] 删除 `VITE_ADMIN_PASSWORD_HASH`、浏览器 SHA-256 验证和 sessionStorage 解锁标记。
- [ ] `POST /api/admin/login` 仅在服务器读取 `ADMIN_PASSWORD` 并做恒定时间校验。
- [ ] 服务器签发 `HttpOnly`、`SameSite=Strict` 会话 cookie；生产环境使用 `Secure`。
- [ ] 提供 session 查询和 logout；前端按异步 session 状态显示门禁。
- [ ] `/api/story-definition` 的读取和写入均要求有效服务器会话。
- [ ] 修改请求校验同源；登录失败具备限速；响应不泄漏密码、摘要或会话签名密钥。
- [ ] 生产服务只监听回环地址，并记录宝塔需要的 HTTPS 跳转/代理头配置。

### C. 验证、提交与 main

- [ ] 数据、迁移、场景概率和鉴权覆盖自动化测试。
- [ ] `npm test`、`npm run lint`、`npm run build` 全部通过。
- [ ] 子代理分别复核场景语义、鉴权边界和 Git 收口方式。
- [ ] 使用路径级暂存，保护既有未跟踪文件与 stash。
- [ ] 至少拆分为“数据回归”和“服务端鉴权”两个提交。
- [ ] 获取最新 `origin/main`；无远端新提交时将本地 `main` fast-forward 到完成分支。
- [ ] 不在本任务中 push 或部署，除非用户另行授权。

## 保护项

- 不改、不暂存当前未跟踪的 `docs/BAOTA_DEPLOYMENT_GUIDE.md` 和 `scripts/`。
- 不恢复或删除现有 stash；其中包含会污染本次场景基线的旧修改。
- 不重写既有 11 个 Storytelling / Seedline 提交；用新的前向提交恢复活动数据，保留历史可追溯性。
