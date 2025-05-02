// src/stores/voter.ts
// ------------------------------------------------------------------
// Pinia store for voter-side workflow: keypair → Merkle proof → sign → submit
// ------------------------------------------------------------------

import { defineStore } from 'pinia'
import api from '@/services/api'
import {
  utils,
  getPublicKeyAsync,
  signAsync,
  type Hex,
  type Bytes
} from '@noble/ed25519'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils'
import {
  getMerkleProof,
  verifyMerkleProof,
  type MerkleProof
} from '@/composables/useMerkle'

/* ------------------------------------------------------------------ */
/* State + Getters                                                    */
/* ------------------------------------------------------------------ */

export const useVoterStore = defineStore('voter', {
  state: () => ({
    skHex: '' as Hex,
    pkHex: '' as Hex,
    proof: null as MerkleProof | null,
    sigHex: '' as Hex,
    status: 'idle' as 'idle' | 'generating' | 'signed' | 'submitted' | 'error',
    receiptHash: '' as string
  }),

  getters: {
    hasKeypair: (s) => !!s.skHex,
    hasProof: (s) => !!s.proof,
    hasSigned: (s) => !!s.sigHex
  },

  /* ----------------------------- actions ------------------------- */
  actions: {
    /** 生成 Ed25519 密钥对 */
    async generateKeypair() {
      this.status = 'generating'
      try {
        const sk = utils.randomPrivateKey()
        const pk: Bytes = await getPublicKeyAsync(sk)
        this.skHex = bytesToHex(sk)
        this.pkHex = bytesToHex(pk)
        this.status = 'idle'
      } catch (e) {
        console.error(e)
        this.status = 'error'
      }
    },

    /** 从公钥列表计算本人的 Merkle 证明 */
    buildProofFromLeaves(leaves: Hex[], myIndex: number) {
      this.proof = getMerkleProof(leaves, myIndex)
    },

    /** 直接设置后台发放的证明 */
    setProof(raw: MerkleProof) {
      this.proof = raw
    },

    /** 本地验证 proof 是否匹配链上 MerkleRoot */
    verifyProofLocally(root: Hex, hashLeaf = true) {
      if (!this.proof) return false
      return verifyMerkleProof(this.pkHex, this.proof, root, hashLeaf)
    },

    /** 签名选票并提交到后端 */
    async signAndSubmit(electionId: string, vote: unknown) {
      if (!this.hasKeypair) throw new Error('Keypair not generated')
      if (!this.proof) throw new Error('Merkle proof missing')

      this.status = 'generating'
      try {
        const msg = utf8ToBytes(JSON.stringify(vote))
        const sig: Bytes = await signAsync(msg, this.skHex)
        this.sigHex = bytesToHex(sig)
        this.status = 'signed'

        const { data } = await api.post<SubmitVoteResp>('/vote', {
          electionId,
          vote,
          sig: this.sigHex,
          pk: this.pkHex,
          merkleProof: this.proof
        })

        this.receiptHash = data.receiptHash
        this.status = 'submitted'
      } catch (err) {
        console.error(err)
        this.status = 'error'
        throw err
      }
    },

    /** 清空全部状态（切换选举 / 登出时使用） */
    reset() {
      this.$reset()
    }
  }
})

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface SubmitVoteResp {
  receiptHash: string
}
