import { defineStore } from 'pinia'
import api from '@/services/api'

export const useElectionStore = defineStore('election', {
  state: () => ({
    list: [] as ElectionMeta[],
    current: null as ElectionDetail | null
  }),

  actions: {
    async fetchAll() {
      const { data } = await api.get<ElectionMeta[]>('/elections')
      this.list = data
    },
    async fetchOne(id: string) {
      const { data } = await api.get<ElectionDetail>(`/elections/${id}`)
      this.current = data
    }
  }
})

export interface ElectionMeta {
  id: string
  title: string
  deadline: string
}

export interface ElectionDetail extends ElectionMeta {
  question: string
  options: string[]
  merkleRoot: string
}
