# AGENTS.md — ContiNew Admin UI（前端）

本文件面向在本仓库工作的编码 Agent，作用域是当前仓库（continew-admin-ui）。
外层聚合工作区的说明见 [../AGENTS.md](../AGENTS.md)。

## 一句话概览

ContiNew Admin 的前端：Vue 3 + TypeScript + Vite 的中后台，UI 使用 Arco Design Vue。

- Vue 3.5 / TypeScript ~5.0.4 / Vite 5 / vue-router 4 / Pinia
- UI 库：@arco-design/web-vue 2.x，样式在 `src/styles/`
- 包管理：pnpm（`pnpm-lock.yaml`、`pnpm-workspace.yaml`；CI 用 Node 18 + pnpm 9）
- 没有 i18n，界面文案直接写中文
- 后端在 `http://localhost:8000`；开发环境用 `/dev-api` 前缀经 Vite 代理过去

## 常用命令

在仓库根目录执行：

~~~bash
pnpm install     # 安装依赖
pnpm dev         # 开发（vite --host，会自动打开浏览器）
pnpm typecheck   # 类型检查（vue-tsc --noEmit）
pnpm build       # 构建（先 vue-tsc --noEmit，再 vite build）
pnpm build:test  # 测试环境构建
pnpm lint        # ESLint
pnpm lint:fix    # ESLint 自动修复
pnpm preview     # 预览构建产物（:5050）
~~~

- `pnpm build` 内含类型检查，类型错误会直接让构建失败——改完请先 `pnpm typecheck`。
- 提交前 `simple-git-hooks` 会通过 `lint-staged` 对暂存文件执行 `eslint --fix`。
- 环境变量在 `.env.development` / `.env.test` / `.env.production`，变量名必须以 `VITE_`（或 `FILE_`）开头才会注入客户端。

## 目录结构

| 目录 | 说明 |
| --- | --- |
| src/apis/ | 接口层，按后端模块分目录（auth/system/monitor/open/tenant/schedule/code/common/area） |
| src/views/ | 页面，目录名与后端模块保持一致 |
| src/components/ | 通用业务组件，`Gi*` 前缀（GiTable、GiForm、GiPageLayout、GiCell* 等） |
| src/hooks/ | 组合式函数：useTable、usePagination、useRequest、useDownload 等 |
| src/stores/modules/ | Pinia store：app、route、tabs、user、dict、tenant |
| src/router/ | route.ts 静态路由、guard.ts 守卫、asyncModules.ts 动态视图映射 |
| src/utils/ | 工具库：http.ts（axios 封装）、auth.ts、has.ts（权限判断）、encrypt.ts（RSA）等 |
| src/config/setting.ts | 默认主题与布局配置 |
| src/constant/ | 通用枚举（GenderList、DisEnableStatusList 等） |
| src/types/ | 全局类型；api.d.ts 定义 ApiRes / PageRes / PageQuery |
| config/plugins/ | Vite 插件配置 |
| src/mock/ | mock 数据（vite-plugin-mock） |

## 自动导入（写代码前必读）

- `ref` / `reactive` / `computed` / `watch` / `onMounted`、以及 vue-router 的 `useRoute` / `useRouter` 由 `unplugin-auto-import` 自动导入，不需要手写 import。
- `src/components/` 下的组件由 `unplugin-vue-components` 全局注册，模板里直接用 `<GiTable />` 即可，不需要 import。
- 这两个插件会生成 `src/types/auto-imports.d.ts` 与 `src/types/components.d.ts`，属于生成物，不要手改。
- 路径别名：`@` 指向 `src`，`~` 指向仓库根。

## 接口层与 HTTP

- 统一用 `@/utils/http`：`http.get/post/put/patch/del`、`http.download`（返回 blob）、`http.request`。
- 响应结构：`ApiRes<T> = { code, data, msg, success, timestamp }`；分页响应 `PageRes<T> = { list, total }`，分页请求参数 `{ page, size }`。
- 请求拦截器自动带上 `Authorization: Bearer <token>` 与租户头 `X-Tenant-Id`；响应拦截器统一处理失败提示和 401 重新登录，业务代码里一般不用再 catch 弹错。
- `src/apis/<module>/index.ts` 导出请求函数，`<module>/type.ts` 导出类型；函数写 `/** @desc ... */` 注释。新增模块要在 `src/apis/index.ts` 里 `export *`。
- 调用示例：`const { data } = await listUser({ ...queryForm, ...page })`。

## 多租户

- 租户开关与租户 ID 存在 `src/stores/modules/tenant.ts`（`tenantEnabled` / `tenantId`，localStorage 持久化）。
- `src/utils/http.ts` 请求拦截器在「已开启租户且已有租户 ID」时自动加 `X-Tenant-Id`。
- 登录页 `src/views/login/index.vue` 的 `onGetTenant()`：调 `/tenant/common/info` 一次拿到「是否开启租户 + 可用租户列表」，再按 `window.location.hostname` 调 `/tenant/common/id` 识别租户；**识别不到时**用该列表渲染租户下拉（`tenantStore.needSelectTenant` 控制显隐，`<a-select>`，选项只有 id/name）。
- 租户选择写入 `selectedTenantId` 并持久化，下次进入登录页默认选中；`onGetTenant()` 会清掉已不在候选列表中的记忆。
- 登录请求可显式指定租户：`accountLogin(req, tenantId)` 会写 `X-Tenant-Id` 头（见 `src/apis/auth/index.ts`）。

## 页面约定

- 列表页 = `GiPageLayout` + `GiTable` + `GiForm`（搜索表单），参考 `src/views/system/user/index.vue`。
- 数据、分页、删除统一走 `useTable(listApi, { immediate })`，它返回 `tableData` / `loading` / `pagination` / `search` / `handleDelete` 等。
- 新增/修改用 `AddDrawer.vue`（个别用 AddModal），详情用 `DetailDrawer.vue`；通过 `defineExpose({ onOpen })` 暴露，父页面用 `ref` 调用，保存成功后 `emit('save-success')`。
- 表单项用 `ColumnItem[]`（来自 `@/components/GiForm`）描述。
- 权限：按钮/操作项用指令 `v-permission="['system:user:create']"`（无权限时元素会被移除）；JS 里用 `@/utils/has` 的 `hasPerm` / `hasPermOr` / `hasRole...`。超管通配符是 `*:*:*`。
- 页面组件加 `defineOptions({ name: 'SystemUser' })`（keep-alive 依赖 name）。
- 密码等敏感字段提交前用 `@/utils/encrypt` 的 RSA 加密，对应后端 `SecureUtils` 解密。

## 路由

- 静态路由（登录页、错误页、个人中心等）写在 `src/router/route.ts`。
- 业务菜单由后端按角色返回，在 `src/stores/modules/route.ts` 里转成动态路由并 `router.addRoute`。
- 视图组件通过 `src/router/asyncModules.ts` 的 `import.meta.glob('@/views/**/*.vue')` 自动收集，key 是相对 `src/views` 的路径——新建页面只要路径与后端菜单的 `component` 字符串一致即可，无需手动注册。
- 守卫在 `src/router/guard.ts`：无 token 跳 `/login`，有 token 先拉用户信息再生成动态路由。

## 代码风格

- ESLint 使用 `@antfu/eslint-config`：无分号、单引号、2 空格缩进。
- Vue SFC 块顺序固定为 `<script setup lang="ts">` -> `<template>` -> `<style>`（`vue/block-order`）。
- 宏顺序：`defineOptions` -> `defineModel` -> `defineProps` -> `defineEmits`，`defineExpose` 放最后。
- 自定义事件名用 kebab-case。
- 样式用 SCSS，`vite.config.ts` 已全局注入 `@/styles/var.scss`，不需要手动 `@use`。

## 提交前自检

- `pnpm typecheck` 通过（`pnpm build` 会强制检查）。
- `pnpm lint` 无新增错误。
- 新增接口已在 `src/apis/index.ts` 导出；新增页面路径与后端菜单 `component` 匹配。
