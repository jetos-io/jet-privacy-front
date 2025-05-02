import { createRouter, createWebHistory } from 'vue-router'
import ElectionList from '@/pages/ElectionList.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: ElectionList },
    { path: '/elections/:id', component: () => import('@/pages/Ballot.vue') },
    { path: '/elections/:id/confirm', component: () => import('@/pages/Receipt.vue') },
    { path: '/elections/:id/result', component: () => import('@/pages/Result.vue') },
    { path: '/verify', component: () => import('@/pages/VerifyTool.vue') },
    {
      path: '/admin',
      component: () => import('@/pages/admin/AdminHome.vue'),
      children: [
        { path: 'elections/create', component: () => import('@/pages/admin/ElectionEditor.vue') },
        { path: 'elections/:id/edit', component: () => import('@/pages/admin/ElectionEditor.vue') },
        { path: 'elections/:id/voters', component: () => import('@/pages/admin/VoterImport.vue') },
        { path: 'elections/:id/progress', component: () => import('@/pages/admin/ProgressMonitor.vue') },
        { path: 'elections/:id/result', component: () => import('@/pages/admin/ResultManager.vue') }
      ]
    }
  ]
})
