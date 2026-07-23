# `/handbook/` 部署清单

1. 在仓库根目录运行活动游戏测试与 `npm run handbook:build`。
2. 确认 `handbook-site/public/index.html`、`wiki/index.html`、`story/index.html`、`archive/index.html` 都存在。
3. 把 `handbook-site/public/` 的内容部署到当前站点文档根的 `handbook/` 子目录，不覆盖电话游戏根目录。
4. 服务器需让 `/handbook/` 返回 `handbook/index.html`，并能把无扩展名深链解析到同名 `.html` 文件。当前 Vite Preview 已满足该行为，不需要额外 SPA 回退。
5. 在线核对 `/handbook/`、`/handbook/wiki/`、`/handbook/story/`、`/handbook/archive/` 与返回电话亭链接。
6. 检查页面源和搜索结果不包含 `people-role-crosswalk`、模板、`AGENTS.md`、`style/`、`styles/` 或 `published/`。

活动正史变更后不要手改网页。先修改源 JSON 与 `story-outline/wiki/`，再更新同步契约、重新构建并部署。

## 当前生产部署

- 部署日期：2026-07-23
- 公开地址：`https://05-telephone.seeds100.bowen.wang/handbook/`
- 服务器目录：`/www/wwwroot/05-telephone/dist/handbook`
- 产物：302个HTML页面；0个站内断链
- 服务配置：沿用现有Node项目、Vite Preview和SSL配置，没有修改游戏进程、Nginx或后台路由

更新时先把新产物解压到同级暂存目录，验证 `handbook/index.html` 后再交换目录；不要在活动目录中逐文件覆盖。保留旧目录直到首页、深层Wiki、章节、搜索与移动端检查通过，再清理本次生成的暂存和回滚副本。
