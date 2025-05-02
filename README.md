# 匿名投票系统（前端）项目实施蓝皮书

> **目标**：在 8 周内交付一个基于 Vue 3 + Pinia + Axios + TypeScript 的匿名投票前端，支持 Merkle + Ed25519 匿名签名、实时进度监控、离线结果复验，并包含完整的后台管理模块。

---

## 1 总体里程碑

| 阶段               | 长度    | 关键交付物                                                 |
| ---------------- | ----- | ----------------------------------------------------- |
| **P0 准备**        | 0.5 周 | 技术栈确认、规范（ESLint/Prettier）、CI 骨架                       |
| **S1 核心框架**      | 1 周   | Vite 模板、全局类型、基础路由、Pinia stores scaffold、Axios 单例      |
| **S2 投票端 MVP**   | 1.5 周 | `ElectionList`, `Ballot`, `Receipt` + Merkle & 签名完整链路 |
| **S3 后台 Admin**  | 1.5 周 | `ElectionEditor`, `VoterImport`, 进度 WebSocket、发布流程    |
| **S4 结果与校验**     | 1 周   | `Result`, `VerifyTool`, 图表可视化、离线复验工具                  |
| **S5 PWA & 多语言** | 0.5 周 | 离线草稿、i18n、暗黑模式                                        |
| **S6 测试与优化**     | 1 周   | Vitest 80% 覆盖、Cypress E2E、性能诊断、上线文档                   |
| **缓冲 / 迭代**      | 1 周   | Bugfix、需求变更、代码审计                                      |

---

## 2 功能需求

### 2.1 投票端（Voter）

* 列出开放选举，提醒截止时刻
* 本地生成 Ed25519 密钥对
* 构造/导入 Merkle 证明
* 对选票对象签名并提交
* 下载投票回执（含签名 & PK 指纹）
* 查看实时计数；选举结束后显示最终结果并可本地复验

### 2.2 后台（Admin）

* 创建 / 编辑选举：题目、选项、截止时间
* 导入选民 CSV（voterId, name, publicKey）
* 生成 MerkleRoot，一键发布并推送邮件 / Token
* WebSocket 实时监控投票进度
* 关闭选举、导出 ballots.json 与 tally.json

### 2.3 系统性需求

* **匿名性**：后端不得反推 voter ↔ vote
* **一次性**：公钥重复提交自动拒绝
* **可验证**：任何人可离线复验 Merkle + 签名
* **易用性**：桌面/移动兼容，签名生成 2 秒内完成
* **安全**：CSP、SRI、Sentry 脱敏日志

---

## 3 技术栈与工具

| 领域     | 选择                                | 说明                           |
| ------ | --------------------------------- | ---------------------------- |
| 框架     | Vue 3 (Composition API)           | 现代、轻量、生态成熟                   |
| 状态     | Pinia                             | 模块化 Store，SSR 友好             |
| 路由     | Vue‑Router 4                      | 懒加载、动态分包                     |
| 加密     | @noble/ed25519 v2 + @noble/hashes | 纯 TS，无依赖，浏览器友好               |
| Merkle | merkletreejs + 自封装                | 兼容 Node/浏览器                  |
| HTTP   | Axios                             | request/response 拦截器         |
| 构建     | Vite + pnpm                       | 秒级热更，原生 ESM                  |
| 测试     | Vitest + Cypress                  | 单元 & E2E                     |
| CI     | GitHub Actions                    | Lint → Test → Build → Docker |
| UI     | TailwindCSS + HeroIcons           | 快速原型，易定制                     |

---

## 4 包/模块划分

```
src/
├─ app/              # 应用壳 (App.vue, layouts)
│   └─ routes/       # 懒加载页面，自动拆包
├─ components/       # 通用组件 (按钮、模态、表单)
├─ pages/            # 按路由对应的页面组件
│   └─ admin/        # 后台子系统路由页
├─ stores/           # Pinia modules
├─ services/         # Axios 实例 + API 函数封装
├─ composables/      # useXXX 组合式函数 (crypto、socket)
├─ utils/            # 纯函数工具库 (validation, formatter)
├─ types/            # **index.ts** (全量数据结构定义)
├─ assets/           # 静态资源 (logo, icons)
└─ styles/           # Tailwind 定制、全局样式
```

> **包规模控制**：
>
> * 路由懒加载自动生成 4 个主要 chunk：`voter`, `admin`, `result`, `verify`。
> * Merkle & noble‑ed25519 wasm 依赖独立 vendor chunk，首屏不下载。

---

## 5 核心数据模型 (详见 `src/types`)

* `Hex`            —— 统一十六进制品牌类型
* `VoterRegistry`  —— 选民 CSV 行
* `ElectionMeta` / `ElectionDetail`
* `VotePayload`    —— 前端提交体
* `MerkleProof`    —— index + siblings
* `SubmitVoteResp` —— 后端回执

---

## 6 API 契约

| Method | Path                          | Auth       | Req Body         | Resp                 |
| ------ | ----------------------------- | ---------- | ---------------- | -------------------- |
| POST   | /auth/token                   | JWT(user)  | { voterId }      | `GetTokenResp`       |
| POST   | /admin/elections              | JWT(admin) | `ElectionDetail` | 200                  |
| POST   | /admin/elections/\:id/voters  | JWT(admin) | CSV file         | { merkleRoot }       |
| POST   | /admin/elections/\:id/publish | JWT(admin) | —                | 200                  |
| GET    | /elections                    | —          | —                | `ElectionMeta[]`     |
| GET    | /elections/\:id               | —          | —                | `ElectionDetail`     |
| POST   | /vote                         | —          | `VotePayload`    | `SubmitVoteResp`     |
| GET    | /result/\:id                  | —          | ?full=1          | `ElectionResultResp` |

---

## 7 开发流程与分支策略

1. **main**：只存可发布版本（CI 自动部署）。
2. **dev**：常规开发集成分支，PR → Review → squash 合并。
3. **feature/**\*：功能或页面；命名如 `feature/ballot-page`。
4. **hotfix/**\*：已发布版本紧急修补。

---

## 8 CI/CD 流程

```yaml
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm test
      - run: pnpm build
      - run: docker build -t vote-frontend .
      - run: docker push ghcr.io/your/repo:latest
```

K8s 或 Nginx 静态托管均可；PWA 模式支持离线填写选票。

---

## 9 测试与质量

* **Vitest**：目标 80 % 行覆盖；crypto & Merkle 纯函数快照测试。
* **Cypress**：用户端 Happy Path、重复投票、截止后投票；后台导入 CSV、发布选举。
* **ESLint + Prettier**：CI 必过；Husky pre‑commit 钩子。
* **Sentry**：source‑map 上报，脱敏 vote / pk。

---

## 10 安全与合规

| 项          | 对策                                                |
| ---------- | ------------------------------------------------- |
| XSS / CSRF | 同源策略 + Axios xsrfHeaderName；Rich‑text 统一 sanitize |
| CSP        | `script-src 'self' 'sha256‑…'`，阻断注入脚本             |
| 依赖漏洞       | GitHub Dependabot；CI `pnpm audit --prod`          |
| 私钥泄漏       | IndexedDB 加密存储 + pagehide 清理                      |
| 匿名性        | 投票接口不留 cookie / token；IP 日志脱敏                     |

---

## 11 未来扩展

* **BLS 聚合签名**：减小 ballots.json 体积
* **L2 上链**：MerkleRoot & tally 哈希写入 Arbitrum/zkSync
* **多选举并行**：用 Redis Stream 推送进度
* **移动端**：Vue Native 专用壳，重用 core composables

---

> 文档版本：v0.2 (2025‑05‑02)
>
> 更新记录：
>
> * v0.1 创建纲要（05‑01）
> * v0.2 整合 `src/types`、CI 脚本与安全章节（05‑02）
