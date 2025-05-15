import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import JudgeView from '../views/JudgeView.vue'
import HostView from '../views/HostView.vue'
import DisplayView from '../views/DisplayView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/judge',
      name: 'judge',
      component: JudgeView,
    },
    {
      path: '/host',
      name: 'host',
      component: HostView,
    },
    {
      path: '/display',
      name: 'display',
      component: DisplayView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
