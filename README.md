# Vivo Pic Vote

百人级图片 / 视频作品投票系统，基于 Next.js App Router + Ant Design。当前版本已经覆盖活动登录、上传、相册投票、管理后台、展示大屏和分片上传流程。

## 已实现能力

- 工号 + 活动口令登录，管理员入口独立校验。
- 用户端高密度相册工作台：编号搜索、图片/视频/我投过筛选、快速投 1 票、作品详情投多票。
- 上传图片或视频，每个用户最多 1 个有效作品，删除后可重传。
- 图片上限 30MB，视频上限 300MB；前端按 10MiB 分片、3 并发上传，失败分片自动重试。
- 管理后台：活动阶段控制、自投开关、展示票数开关、账号新增、CSV 导入、票数/权限编辑、作品隐藏/恢复/删除、投票明细。
- 展示端：作品墙 / 实时排名切换，排行榜已按大屏扫视优化，支持隐藏具体票数。
- Cloudflare Workers 部署骨架已按 PetDaily 路线接入 OpenNext，D1 / R2 binding 配置已放入 `wrangler.jsonc`。
- 本地开发默认使用 `data/store.json` 和 `public/uploads/` 做兜底持久化。

## 演示账号

登录页不会展示或预填演示账号，活动现场只发放实际工号和口令。开发测试可使用：

- 普通用户：`10001 / demo123`
- 管理员：`90001 / admin123`

## 本地启动

```bash
npm install
npm run dev
```

默认访问：

- 用户端：`http://127.0.0.1:3000/login`
- 管理端：`http://127.0.0.1:3000/admin/login`
- 展示端：`http://127.0.0.1:3000/display`

## Cloudflare 配置

当前部署路线参考 PetDaily 项目，使用 `@opennextjs/cloudflare` 生成 Workers 产物：

- Worker 入口：`.open-next/worker.js`
- 静态资源目录：`.open-next/assets`
- Assets binding：`ASSETS`
- D1 binding：`DB`
- R2 binding：`MEDIA_BUCKET`

首次配置资源：

```bash
nvm use
node -v
npm run cf:whoami
npm run cf:d1:create
npm run cf:r2:create
```

把 `wrangler.jsonc` 里的 `database_id` 替换为 `cf:d1:create` 返回的真实 ID，然后执行迁移：

```bash
npm run cf:d1:migrate:remote
```

构建、预览、部署：

```bash
npm run cf:clean
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

常用诊断命令：

```bash
npm run cf:whoami
npm run cf:d1:migrate:local
npm run cf:d1:migrate:remote
```

注意：

- 当前 shell 如果是 Node 20，会无法运行 Wrangler 4；请先执行 `nvm use`，确认 `node -v` 是 `.nvmrc` 指定的 24.14.0 或任意 Node 22+。
- `npx wrangler deploy --dry-run` 只做预检，不会在 Cloudflare 上创建 Worker。真正创建或更新 Worker 要执行 `npm run cf:deploy`。
- 如果构建时出现 `PageNotFoundError: Cannot find module for page`，先执行 `npm run cf:clean` 清掉旧 `.next` / `.open-next` 产物，再重新 `npm run cf:build`。
- 当前代码已经具备 OpenNext / Wrangler 部署入口，但业务数据层仍默认使用本地 JSON 和本地上传目录兜底；要让手机端线上真实写入 Cloudflare，还需要把 `src/lib/store.ts` 和 `src/lib/storage.ts` 完整切到 D1 / R2。
