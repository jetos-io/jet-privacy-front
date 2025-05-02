// src/composables/useMerkle.ts
// ------------------------------------------------------------
// Merkle helper powered by `merkletreejs` (SHA‑256).
// ------------------------------------------------------------
// • 叶子与兄弟节点均用统一 Hex 类型（见 src/types/crypto.ts）。
// • `duplicateOdd: true` 兼容 BTC/SPV 奇数补齐规则。
// • 仅导出四个函数：
//      computeMerkleRoot, getMerkleProof, verifyMerkleProof, buildProof.
// ------------------------------------------------------------

import { MerkleTree } from 'merkletreejs'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'
import type {Hex} from "@noble/ed25519";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface MerkleProof {
  /** 目标叶子在原数组中的索引 */
  index: number
  /** 自底向上兄弟节点列表（无 0x 前缀小写 Hex） */
  siblings: Hex[]
}

/* ------------------------------------------------------------------ */
/* Utility                                                            */
/* ------------------------------------------------------------------ */

/** 去掉 0x 并统一小写 */
const cleanHex = (h: Hex) => h.toString().replace(/^0x/i, '').toLowerCase()

/** Hex → Buffer */
export const hexToBuffer = (h: Hex) => Buffer.from(cleanHex(h), 'hex')

/** Buffer／Uint8Array → Hex（无 0x） */
const bufToHex = (b: Buffer | Uint8Array): Hex => bytesToHex(new Uint8Array(b))

/** sha256 封装返回 Buffer，供 merkletreejs 调用 */
const sha256Buf = (data: Buffer) => Buffer.from(sha256(new Uint8Array(data)))

/** 把 Hex[] 转 Buffer[] */
const leavesToBufs = (leaves: Hex[]) => leaves.map(hexToBuffer)

/* ------------------------------------------------------------------ */
/* 1) 计算 Merkle Root                                                */
/* ------------------------------------------------------------------ */

export function computeMerkleRoot(leaves: Hex[], hashLeaves = true): Hex {
  if (!leaves.length) throw new Error('empty leaves')

  const tree = new MerkleTree(leavesToBufs(leaves), sha256Buf, {
    hashLeaves,
    duplicateOdd: true,
    sortPairs: false
  })
  return bufToHex(tree.getRoot())
}

/* ------------------------------------------------------------------ */
/* 2) 生成 Merkle Proof                                               */
/* ------------------------------------------------------------------ */

export function getMerkleProof(
  leaves: Hex[],
  index: number,
  hashLeaves = true
): MerkleProof {
  if (index < 0 || index >= leaves.length) throw new RangeError('index out of range')

  const tree = new MerkleTree(leavesToBufs(leaves), sha256Buf, {
    hashLeaves,
    duplicateOdd: true,
    sortPairs: false
  })

  const proof = tree.getProof(hexToBuffer(leaves[index]))
  const siblings = proof.map((p) => bufToHex(p.data))

  return { index, siblings }
}

/* ------------------------------------------------------------------ */
/* 3) 校验证明（无需构造整棵树）                                     */
/* ------------------------------------------------------------------ */

export function verifyMerkleProof(
  leaf: Hex,
  proof: MerkleProof,
  root: Hex,
  hashLeaf = true
): boolean {
  const proofBuffers = proof.siblings.map((sib, i) => ({
    position: (proof.index >> i) & 1 ? 'left' : 'right',
    data: hexToBuffer(sib)
  }))

  const tree = new MerkleTree([], sha256Buf) // 只用其 verify
  const leafBuf = hashLeaf ? sha256Buf(hexToBuffer(leaf)) : hexToBuffer(leaf)
  return tree.verify(proofBuffers, leafBuf, hexToBuffer(root))
}

/* ------------------------------------------------------------------ */
/* 4) 清洗后台下发的 Proof                                            */
/* ------------------------------------------------------------------ */

export function buildProof(raw: MerkleProof): MerkleProof {
  return {
    index: raw.index,
    siblings: raw.siblings.map(cleanHex)
  }
}
