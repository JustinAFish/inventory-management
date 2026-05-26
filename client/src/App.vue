<template>
  <div class="app" :class="{ 'sidebar-open': sidebarOpen }">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-name">{{ t('nav.companyName') }}</div>
        <div class="sidebar-logo-subtitle">{{ t('nav.subtitle') }}</div>
      </div>

      <nav class="sidebar-nav">
        <template v-for="section in navSections" :key="section.label">
          <div class="nav-section-label">{{ t('nav.' + section.label) }}</div>
          <router-link
            v-for="item in section.items"
            :key="item.key"
            :to="item.path"
            class="nav-item"
          >
            <svg
              class="nav-icon"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <template v-if="item.icon === 'overview'">
                <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.5"/>
                <rect x="9" y="2.5" width="4.5" height="4.5" rx="0.5"/>
                <rect x="2.5" y="9" width="4.5" height="4.5" rx="0.5"/>
                <rect x="9" y="9" width="4.5" height="4.5" rx="0.5"/>
              </template>
              <template v-else-if="item.icon === 'inventory'">
                <path d="M2.5 5L8 2.5L13.5 5V11L8 13.5L2.5 11V5Z" stroke-linejoin="round"/>
                <path d="M2.5 5L8 7.5L13.5 5" stroke-linejoin="round"/>
                <path d="M8 7.5V13.5"/>
              </template>
              <template v-else-if="item.icon === 'orders'">
                <rect x="3" y="3" width="10" height="11" rx="1"/>
                <rect x="5.5" y="1.75" width="5" height="2.5" rx="0.5"/>
                <path d="M5.5 8H10.5M5.5 11H8.5" stroke-linecap="round"/>
              </template>
              <template v-else-if="item.icon === 'restocking'">
                <path d="M13.5 8C13.5 11 11 13.5 8 13.5C6 13.5 4.3 12.5 3.3 11" stroke-linecap="round"/>
                <path d="M2.5 8C2.5 5 5 2.5 8 2.5C10 2.5 11.7 3.5 12.7 5" stroke-linecap="round"/>
                <path d="M10.5 5.5H13V3M5.5 10.5H3V13" stroke-linecap="round" stroke-linejoin="round"/>
              </template>
              <template v-else-if="item.icon === 'finance'">
                <circle cx="8" cy="8" r="5.5"/>
                <path d="M8 4.5V11.5" stroke-linecap="round"/>
                <path d="M10 6.5H6.75C6.05 6.5 5.5 7.05 5.5 7.75C5.5 8.45 6.05 9 6.75 9H9.25C9.95 9 10.5 9.55 10.5 10.25C10.5 10.95 9.95 11.5 9.25 11.5H6" stroke-linecap="round" stroke-linejoin="round"/>
              </template>
              <template v-else-if="item.icon === 'demand'">
                <path d="M2.5 12L6 8.5L9 11L13.5 4.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 4.5H13.5V8" stroke-linecap="round" stroke-linejoin="round"/>
              </template>
              <template v-else-if="item.icon === 'reports'">
                <path d="M2.5 13.5V8M6 13.5V4M9.5 13.5V10M13 13.5V6" stroke-linecap="round"/>
              </template>
            </svg>
            <span class="nav-label">{{ t('nav.' + item.key) }}</span>
          </router-link>
        </template>
      </nav>

      <div class="sidebar-footer">
        <LanguageSwitcher />
        <ProfileMenu
          @show-profile-details="showProfileDetails = true"
          @show-tasks="showTasks = true"
        />
      </div>
    </aside>

    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false"></div>

    <div class="app-shell">
      <header class="topbar">
        <button
          class="topbar-mobile-toggle"
          @click="sidebarOpen = !sidebarOpen"
          aria-label="Toggle navigation"
        >
          <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 4H13M3 8H13M3 12H13" stroke-linecap="round"/>
          </svg>
        </button>
        <h1 class="topbar-title">{{ currentPageTitle }}</h1>
        <FilterBar class="topbar-filters" />
      </header>

      <main class="main-content">
        <router-view />
      </main>
    </div>

    <ProfileDetailsModal
      :is-open="showProfileDetails"
      @close="showProfileDetails = false"
    />

    <TasksModal
      :is-open="showTasks"
      :tasks="tasks"
      @close="showTasks = false"
      @add-task="addTask"
      @delete-task="deleteTask"
      @toggle-task="toggleTask"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from './api'
import { useAuth } from './composables/useAuth'
import { useI18n } from './composables/useI18n'
import FilterBar from './components/FilterBar.vue'
import ProfileMenu from './components/ProfileMenu.vue'
import ProfileDetailsModal from './components/ProfileDetailsModal.vue'
import TasksModal from './components/TasksModal.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'

export default {
  name: 'App',
  components: {
    FilterBar,
    ProfileMenu,
    ProfileDetailsModal,
    TasksModal,
    LanguageSwitcher
  },
  setup() {
    const { currentUser } = useAuth()
    const { t } = useI18n()
    const route = useRoute()
    const showProfileDetails = ref(false)
    const showTasks = ref(false)
    const apiTasks = ref([])
    const sidebarOpen = ref(false)

    const navSections = [
      { label: 'sectionMain', items: [
        { path: '/', key: 'overview', icon: 'overview' },
        { path: '/inventory', key: 'inventory', icon: 'inventory' },
        { path: '/orders', key: 'orders', icon: 'orders' },
        { path: '/restocking', key: 'restocking', icon: 'restocking' },
      ]},
      { label: 'sectionAnalytics', items: [
        { path: '/spending', key: 'finance', icon: 'finance' },
        { path: '/demand', key: 'demandForecast', icon: 'demand' },
        { path: '/reports', key: 'reports', icon: 'reports' },
      ]},
    ]

    const currentPageTitle = computed(() => {
      const key = route.meta.title
      return key ? t('nav.' + key) : ''
    })

    // Merge mock tasks from currentUser with API tasks
    const tasks = computed(() => {
      return [...currentUser.value.tasks, ...apiTasks.value]
    })

    const loadTasks = async () => {
      try {
        apiTasks.value = await api.getTasks()
      } catch (err) {
        console.error('Failed to load tasks:', err)
      }
    }

    const addTask = async (taskData) => {
      try {
        const newTask = await api.createTask(taskData)
        // Add new task to the beginning of the array
        apiTasks.value.unshift(newTask)
      } catch (err) {
        console.error('Failed to add task:', err)
      }
    }

    const deleteTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const isMockTask = currentUser.value.tasks.some(t => t.id === taskId)

        if (isMockTask) {
          // Remove from mock tasks
          const index = currentUser.value.tasks.findIndex(t => t.id === taskId)
          if (index !== -1) {
            currentUser.value.tasks.splice(index, 1)
          }
        } else {
          // Remove from API tasks
          await api.deleteTask(taskId)
          apiTasks.value = apiTasks.value.filter(t => t.id !== taskId)
        }
      } catch (err) {
        console.error('Failed to delete task:', err)
      }
    }

    const toggleTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const mockTask = currentUser.value.tasks.find(t => t.id === taskId)

        if (mockTask) {
          // Toggle mock task status
          mockTask.status = mockTask.status === 'pending' ? 'completed' : 'pending'
        } else {
          // Toggle API task
          const updatedTask = await api.toggleTask(taskId)
          const index = apiTasks.value.findIndex(t => t.id === taskId)
          if (index !== -1) {
            apiTasks.value[index] = updatedTask
          }
        }
      } catch (err) {
        console.error('Failed to toggle task:', err)
      }
    }

    watch(() => route.path, () => {
      sidebarOpen.value = false
    })

    onMounted(loadTasks)

    return {
      t,
      showProfileDetails,
      showTasks,
      tasks,
      addTask,
      deleteTask,
      toggleTask,
      sidebarOpen,
      navSections,
      currentPageTitle
    }
  }
}
</script>

<style>
:root {
  --surface-0: #ffffff;
  --surface-1: #fafafa;
  --surface-2: #f4f4f5;
  --surface-sidebar: #0a0a0a;
  --surface-sidebar-hover: #1a1a1a;
  --surface-sidebar-active: #27272a;
  --text-primary: #09090b;
  --text-secondary: #52525b;
  --text-tertiary: #a1a1aa;
  --text-on-dark: #fafafa;
  --text-on-dark-muted: #a1a1aa;
  --border-subtle: #e4e4e7;
  --border-default: #d4d4d8;
  --border-strong: #a1a1aa;
  --border-on-dark: #27272a;
  --accent: #5e6ad2;
  --accent-hover: #4f5ac0;
  --accent-bg-subtle: #eef0ff;
  --status-success: #16a34a;
  --status-success-bg: #dcfce7;
  --status-warning: #d97706;
  --status-warning-bg: #fef3c7;
  --status-danger: #dc2626;
  --status-danger-bg: #fee2e2;
  --status-info: #2563eb;
  --status-info-bg: #dbeafe;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-md: 15px;
  --text-lg: 18px;
  --text-xl: 22px;
  --text-2xl: 28px;
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.10);
  --sidebar-width: 232px;
  --topbar-height: 52px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  background: var(--surface-1);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Layout shell ── */

.app {
  display: flex;
  min-height: 100vh;
}

.app-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ── Sidebar ── */

.sidebar {
  width: var(--sidebar-width);
  background: var(--surface-sidebar);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 100vh;
}

.sidebar-logo {
  padding: var(--space-5) var(--space-5) var(--space-4);
}

.sidebar-logo-name {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-on-dark);
  line-height: var(--leading-tight);
}

.sidebar-logo-subtitle {
  font-size: var(--text-xs);
  color: var(--text-on-dark-muted);
  margin-top: var(--space-1);
}

.sidebar-nav {
  padding: var(--space-3) 0;
  flex: 1;
  overflow-y: auto;
}

.nav-section-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  padding: var(--space-3) var(--space-5) var(--space-1);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  margin: 0 var(--space-2);
  border-radius: var(--radius-md);
  color: var(--text-on-dark-muted);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: 500;
  transition: background 120ms ease, color 120ms ease;
}

.nav-item:hover {
  background: var(--surface-sidebar-hover);
  color: var(--text-on-dark);
}

.nav-item.router-link-active {
  background: var(--surface-sidebar-active);
  color: var(--text-on-dark);
}

.nav-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: var(--space-3);
  border-top: 1px solid var(--border-on-dark);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* ── Topbar ── */

.topbar {
  height: var(--topbar-height);
  background: var(--surface-0);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  padding: 0 var(--space-6);
  gap: var(--space-5);
  position: sticky;
  top: 0;
  z-index: 50;
}

.topbar-mobile-toggle {
  display: none;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-md);
  align-items: center;
  justify-content: center;
}

.topbar-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex-shrink: 0;
  letter-spacing: -0.01em;
}

.topbar-filters {
  flex: 1;
  display: flex;
  min-width: 0;
}

/* ── Main content ── */

.main-content {
  flex: 1;
  padding: var(--space-6) var(--space-8);
  overflow-y: auto;
  background: var(--surface-1);
}

/* ── Sidebar backdrop (mobile) ── */

.sidebar-backdrop {
  background: rgba(0, 0, 0, 0.4);
  position: fixed;
  inset: 0;
  z-index: 99;
}

/* ── Page header ── */

.page-header {
  margin-bottom: var(--space-6);
}

.page-header h2 {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
  letter-spacing: -0.02em;
}

.page-header p {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

/* ── Stats grid ── */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

/* ── Stat cards ── */

.stat-card {
  background: var(--surface-0);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  transition: box-shadow 150ms ease, border-color 150ms ease;
}

.stat-card:hover {
  border-color: var(--border-default);
  box-shadow: var(--shadow-md);
}

.stat-label {
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: var(--space-2);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.stat-card.warning .stat-value {
  color: var(--status-warning);
}

.stat-card.success .stat-value {
  color: var(--status-success);
}

.stat-card.danger .stat-value {
  color: var(--status-danger);
}

.stat-card.info .stat-value {
  color: var(--status-info);
}

/* ── Cards ── */

.card {
  background: var(--surface-0);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  margin-bottom: var(--space-5);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.card-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
}

.card-body {
  padding: var(--space-5);
}

/* ── Tables ── */

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--surface-2);
}

th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  font-weight: 500;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

td {
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

tbody tr {
  transition: background-color 0.15s ease;
}

tbody tr:hover {
  background: var(--surface-1);
}

/* ── Badges ── */

.badge {
  display: inline-block;
  padding: 2px var(--space-2);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: none;
}

.badge.success {
  background: var(--status-success-bg);
  color: var(--status-success);
}

.badge.warning {
  background: var(--status-warning-bg);
  color: var(--status-warning);
}

.badge.danger {
  background: var(--status-danger-bg);
  color: var(--status-danger);
}

.badge.info {
  background: var(--status-info-bg);
  color: var(--status-info);
}

.badge.increasing {
  background: var(--status-success-bg);
  color: var(--status-success);
}

.badge.decreasing {
  background: var(--status-danger-bg);
  color: var(--status-danger);
}

.badge.stable {
  background: var(--status-info-bg);
  color: var(--status-info);
}

.badge.high {
  background: var(--status-danger-bg);
  color: var(--status-danger);
}

.badge.medium {
  background: var(--status-warning-bg);
  color: var(--status-warning);
}

.badge.low {
  background: var(--status-info-bg);
  color: var(--status-info);
}

/* ── Loading / Error ── */

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.error {
  background: var(--status-danger-bg);
  border: 1px solid var(--status-danger);
  color: var(--status-danger);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  margin: var(--space-4) 0;
  font-size: var(--text-sm);
}

/* ── Mobile ── */

@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
    transition: transform 200ms ease;
    z-index: 100;
  }

  .app.sidebar-open .sidebar {
    transform: translateX(0);
  }

  .topbar-mobile-toggle {
    display: flex;
  }

  .main-content {
    padding: var(--space-4) var(--space-4);
  }
}
</style>
