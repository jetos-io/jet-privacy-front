// src/stores/ui.ts
import { defineStore } from 'pinia'

export interface SnackMsg {
  type: 'info' | 'success' | 'warning' | 'error'
  text: string
  timeout?: number          // ms；缺省 3000
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    loading: false,
    dark: false,
    lang: 'zh-CN' as 'zh-CN' | 'en',
    snackbar: null as SnackMsg | null
  }),

  actions: {
    setLoading(v: boolean) {
      this.loading = v
    },
    toggleDark() {
      this.dark = !this.dark
      document.documentElement.classList.toggle('dark', this.dark)
    },
    setLang(l: 'zh-CN' | 'en') {
      this.lang = l
    },
    /** 推送全局消息 */
    pushMsg(msg: SnackMsg) {
      this.snackbar = msg
      if (msg.timeout !== 0) {
        setTimeout(() => (this.snackbar = null), msg.timeout ?? 3000)
      }
    },
    clearMsg() {
      this.snackbar = null
    }
  }
})
