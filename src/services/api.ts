import axios from 'axios'
import { useUiStore } from '@/stores/ui'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15_000
})

api.interceptors.request.use(cfg => {
  // 若需要带上 token／jwt，可在这里注入
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    const ui = useUiStore()
    ui.pushMsg({ type: 'error', text: err.response?.data?.message ?? err.message })
    return Promise.reject(err)
  }
)

export default api
