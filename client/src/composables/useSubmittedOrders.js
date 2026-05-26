import { ref, computed } from 'vue'

const STORAGE_KEY = 'submitted-restocking-orders'

// Lead times applied at submission time, not stored upstream — keeps the
// composable self-contained so Orders.vue can render lead time from each
// order without re-deriving it.
const LEAD_TIME_DAYS_BY_CATEGORY = {
  'Circuit Boards': 14,
  'Sensors': 7,
  'Actuators': 10,
  'Controllers': 12
}

const DEFAULT_LEAD_TIME = 10

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const submittedOrders = ref(loadFromStorage())

const persist = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submittedOrders.value))
}

const leadTimeFor = (category) => {
  return LEAD_TIME_DAYS_BY_CATEGORY[category] ?? DEFAULT_LEAD_TIME
}

const addDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function useSubmittedOrders() {
  const submitOrder = (items) => {
    if (!items.length) return null

    // Lead time for the whole order is the slowest item — an order ships
    // when all line items are ready.
    const maxLeadTime = Math.max(...items.map(i => leadTimeFor(i.category)))
    const now = new Date().toISOString()
    const orderNumber = `RST-${Date.now().toString().slice(-8)}`
    const totalValue = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0)

    const order = {
      id: `restock-${Date.now()}`,
      order_number: orderNumber,
      submitted_at: now,
      lead_time_days: maxLeadTime,
      expected_delivery: addDays(now, maxLeadTime),
      status: 'Submitted',
      total_value: Math.round(totalValue * 100) / 100,
      items: items.map(i => ({
        sku: i.item_sku,
        name: i.item_name,
        category: i.category,
        quantity: i.quantity,
        unit_price: i.unit_cost,
        lead_time_days: leadTimeFor(i.category)
      }))
    }

    submittedOrders.value = [order, ...submittedOrders.value]
    persist()
    return order
  }

  const clearAll = () => {
    submittedOrders.value = []
    persist()
  }

  const totalSubmittedValue = computed(() =>
    submittedOrders.value.reduce((sum, o) => sum + o.total_value, 0)
  )

  return {
    submittedOrders,
    totalSubmittedValue,
    submitOrder,
    clearAll,
    leadTimeFor
  }
}
