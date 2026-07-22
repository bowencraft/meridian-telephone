# `/handbook/` 部署清单

1. 在仓库根目录运行活动游戏测试与 `npm run handbook:build`。
2. 确认 `handbook-site/public/index.html`、`wiki/index.html`、`story/index.html`、`archive/index.html` 都存在。
3. 把 `handbook-site/public/` 的内容部署到当前站点文档根的 `handbook/` 子目录，不覆盖电话游戏根目录。
4. 服务器需让 `/handbook/` 返回 `handbook/index.html`；Quartz 已生成各页面目录的 `index.html`，通常不需要 SPA 回退。
5. 在线核对 `/handbook/`、`/handbook/wiki/`、`/handbook/story/`、`/handbook/archive/` 与返回电话亭链接。
6. 检查页面源和搜索结果不包含 `people-role-crosswalk`、模板、`AGENTS.md`、`style/`、`styles/` 或 `published/`。

活动正史变更后不要手改网页。先修改源 JSON 与 `story-outline/wiki/`，再更新同步契约、重新构建并部署。
