import { createRouter, createWebHistory } from 'vue-router'
import PublicView from '@/views/PublicView.vue'
import AdminView  from '@/views/AdminView.vue'

const routes = [
  { path: '/',       name: 'Public', component: PublicView },
  { path: '/admin',  name: 'Admin',  component: AdminView },
  // redirigir rutas desconocidas a pública
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export default createRouter({
  history: createWebHistory(),
  routes
})