// src/types/index.ts
// ------------------------------------------------------------
// 全局通用 TypeScript 类型定义（仅数据结构，无算法实现）
// ------------------------------------------------------------
// 若需拆分子模块，可按需 re‑export，但本文件力求聚合：
//   • 用户 / 选民
//   • 选举 / 选票
//   • Merkle & 加密相关
//   • 后端接口 Payload & Response
// ------------------------------------------------------------

import type { Hex } from '@noble/ed25519'

/* ------------------------------------------------------------------ */
/* 1. 用户 / 选民                                                      */
/* ------------------------------------------------------------------ */

/** 平台用户（管理端或普通选民登录所需） */
export interface User {
  userId: string
  username: string
  email: string
  role: 'admin' | 'voter'
}

/** 选民登记信息（CSV 或后台导入） */
export interface VoterRegistry {
  voterId: string
  name?: string
  /** 公钥十六进制，32 字节 */
  publicKey: Hex
}

/* ------------------------------------------------------------------ */
/* 2. 选举 / 选票                                                     */
/* ------------------------------------------------------------------ */

/** 选举精简信息（列表页） */
export interface ElectionMeta {
  id: string
  title: string
  /** ISO‑8601 截止时间 */
  deadline: string
}

/** 选举详情（投票页 / 后台编辑页） */
export interface ElectionDetail extends ElectionMeta {
  description?: string
  question: string
  options: string[]
  /** Merkle 根（Hex，40/64 字符） */
  merkleRoot: Hex
}

/** 前端提交的选票结构 */
export interface VotePayload {
  /** 选举 ID */
  electionId: string
  /** 任意可序列化内容，如 { choice: 1 } 或 { choices: [0,2] } */
  vote: unknown
  /** Ed25519 签名 Hex (64 bytes) */
  sig: Hex
  /** 选民公钥 Hex (32 bytes) */
  pk: Hex
  /** Merkle 证明 */
  merkleProof: MerkleProof
}

/* ------------------------------------------------------------------ */
/* 3. Merkle & 加密相关                                               */
/* ------------------------------------------------------------------ */

/** Merkle 证明（须与 useMerkle.ts 保持一致） */
export interface MerkleProof {
  index: number
  siblings: Hex[]
}

/** submitVote 接口响应 */
export interface SubmitVoteResp {
  receiptHash: string
}

/** 获取结果接口 */
export interface ElectionResultResp {
  /** 已去标识化的加密选票列表 */
  ballots?: VotePayload[]
  /** 已统计的计数，如 [12, 5, 8] 表示各选项数量 */
  tally?: number[]
  /** 公告的 MerkleRoot，用于复验 */
  merkleRoot: Hex
}

/* ------------------------------------------------------------------ */
/* 4. 一次性 Token / Auth                                             */
/* ------------------------------------------------------------------ */

/** 后台发放的一次性投票 Token */
export interface OneTimeToken {
  token: string
  /** 过期时间（ISO‑8601） */
  expiresAt: string
}

/** 获取 token 接口返回值 */
export interface GetTokenResp extends OneTimeToken {
  serverPubKey: Hex
}

/* ------------------------------------------------------------------ */
/* 5. 辅助 / 复用类型                                                 */
/* ------------------------------------------------------------------ */

/** UI 通用消息 */
export interface SnackbarMsg {
  type: 'info' | 'success' | 'warning' | 'error'
  text: string
  timeout?: number // ms
}

/** WebSocket 实时进度推送 */
export interface ProgressPush {
  electionId: string
  total: number
  counted: number
}

/* ------------------------------------------------------------------ */
/* Re‑exports（方便外部统一导入）                                    */
/* ------------------------------------------------------------------ */

export type { Hex }
