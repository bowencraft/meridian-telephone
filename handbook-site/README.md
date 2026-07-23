# 十九号夜班手册

Telephone 的 Quartz 子站，生产路径为 `/handbook/`。它把同一批 Markdown 分成三种读法：

- `/handbook/wiki/`：只以当前恢复的活动 JSON 为最高正史；
- `/handbook/story/`：从六章编辑容器的 `## Draft` 派生网页小说；
- `/handbook/archive/`：扩写设定、大纲与开发记录，统一显示 `[网页未实装]`。

## 内容来源与排除

`npm run sync` 会重建 `content/`，不要直接编辑生成目录。源内容来自上一级的 `story-outline/`，但会排除：

- `AGENTS.md`；
- `_template` / `-template` 文件；
- `style/` 与防御性的 `styles/`；
- `published/`；
- `handbook-site/internal/`（包括人物活动角色对照表）。

当前同步契约是 74 个作者源、7 个 Wiki 源、6 个派生小说页。活动数据契约是 40 个节点、74 条边、8 个号码、3 个主动来电、6 件墙面物件、4 件柜台物件和 7 个结局。数量变化必须伴随同步脚本、校验脚本和实施计划一起更新。

## 本地命令

要求 Node 22+ 与 npm 10.9.2+。

```bash
npm ci
npm run sync
npm run validate
npm run build
npm run dev
```

也可以在仓库根目录使用 `npm run handbook:sync`、`npm run handbook:check`、`npm run handbook:build` 和 `npm run handbook:dev`。

`public/` 是构建输出，不进入 Git。部署时将它同步到站点根目录下的 `handbook/` 目录，并保证服务器对 `/handbook/*` 使用同目录的静态文件；Quartz 的生产 `baseUrl` 已设为 `05-telephone.seeds100.bowen.wang/handbook`。

## Quartz 基线

本工程从 Quartz 5 官方仓库的 `v5` 分支复制，固定基线提交：

```text
9cf87ff1c248a8ca551093214b0fec3b31415009
```

Quartz 原始许可证保存在 `LICENSE.txt`。自定义入口是 `quartz/components/HandbookMasthead.tsx`、`quartz/styles/custom.scss`、`quartz.config.yaml` 与 `scripts/`。
