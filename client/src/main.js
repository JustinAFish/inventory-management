import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Dashboard from './views/Dashboard.vue'
import Inventory from './views/Inventory.vue'
import Orders from './views/Orders.vue'
import Demand from './views/Demand.vue'
import Spending from './views/Spending.vue'
import Reports from './views/Reports.vue'
import Restocking from './views/Restocking.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Dashboard, meta: { title: 'overview' } },
    { path: '/inventory', component: Inventory, meta: { title: 'inventory' } },
    { path: '/orders', component: Orders, meta: { title: 'orders' } },
    { path: '/demand', component: Demand, meta: { title: 'demandForecast' } },
    { path: '/spending', component: Spending, meta: { title: 'finance' } },
    { path: '/reports', component: Reports, meta: { title: 'reports' } },
    { path: '/restocking', component: Restocking, meta: { title: 'restocking' } }
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
