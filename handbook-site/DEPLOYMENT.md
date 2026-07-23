# `/handbook/` 部署清单

1. 在仓库根目录运行活动游戏测试与 `npm run handbook:build`。
2. 确认 `handbook-site/public/index.html`、`wiki/index.html`、`story/index.html`、`archive/index.html` 都存在。
3. 把 `handbook-site/public/` 的内容部署到当前站点文档根的 `handbook/` 子目录，不覆盖电话游戏根目录。
4. 服务器需把精确路径 `/handbook` 以 `301` 跳转到 `/handbook/`，让 `/handbook/` 返回 `handbook/index.html`，并能把无扩展名深链解析到同名 `.html` 文件。当前 Vite Preview 已满足深链行为，不需要额外 SPA 回退。
5. 在线核对 `/handbook`、`/handbook/`、`/handbook/wiki/`、`/handbook/story/`、`/handbook/archive/` 与返回电话亭链接。
6. 检查页面源和搜索结果不包含 `people-role-crosswalk`、模板、`AGENTS.md`、`style/`、`styles/` 或 `published/`。

活动正史变更后不要手改网页。先修改源 JSON 与 `story-outline/wiki/`，再更新同步契约、重新构建并部署。

## 当前生产部署

- 部署日期：2026-07-23
- 公开地址：`https://05-telephone.seeds100.bowen.wang/handbook/`
- 服务器目录：`/www/wwwroot/05-telephone/handbook`
- 产物：302个HTML页面；0个站内断链
- 服务配置：通过宝塔的 `extension/05_telephone/handbook.conf` 把 `/handbook` 规范化到 `/handbook/`，并为 `/handbook/` 设置静态优先规则；沿用现有SSL，没有修改游戏进程、启动命令或后台路由

手册目录独立于 Vite 的 `dist/`，游戏重新构建不会删除它；仓库根 `.gitignore` 也显式忽略 `/handbook/`，避免服务器工作树把发布产物当作源码。更新时先把新产物解压到同级暂存目录，验证 `handbook/index.html` 后再交换目录；不要在活动目录中逐文件覆盖。保留旧目录直到首页、深层Wiki、章节、搜索与移动端检查通过，再清理本次生成的暂存和回滚副本。

生产静态规则保存在 `deploy/handbook.nginx.conf`。安装或修改后必须先执行 `nginx -t`，只有语法检查成功才允许 reload；响应头 `X-Handbook-Static: quartz` 用于确认请求没有落回Node反向代理。

移动端验收至少使用 `390 × 844` 视口：顶部工具栏应保持单行，分区导航可以横向滚动，目录以覆盖式抽屉打开且不平移正文；Wiki表格、小说正文和面包屑都不得造成页面级横向溢出。
