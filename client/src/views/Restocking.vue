<template>
  <div class="restocking">
    <div class="page-header">
      <h2>Restocking</h2>
      <p>Set a budget and we'll recommend items to restock based on demand forecasts.</p>
    </div>

    <div v-if="loading" class="loading">Loading demand forecasts...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="card budget-card">
        <div class="budget-header">
          <div>
            <div class="budget-label">Available Budget</div>
            <div class="budget-value">{{ currencySymbol }}{{ budget.toLocaleString() }}</div>
          </div>
          <div class="budget-stats">
            <div class="budget-stat">
              <div class="budget-stat-label">Allocated</div>
              <div class="budget-stat-value">{{ currencySymbol }}{{ allocatedTotal.toLocaleString() }}</div>
            </div>
            <div class="budget-stat">
              <div class="budget-stat-label">Remaining</div>
              <div class="budget-stat-value" :class="{ low: remaining < minItemCost }">
                {{ currencySymbol }}{{ remaining.toLocaleString() }}
              </div>
            </div>
            <div class="budget-stat">
              <div class="budget-stat-label">Items</div>
              <div class="budget-stat-value">{{ recommendedCart.length }} / {{ forecasts.length }}</div>
            </div>
          </div>
        </div>

        <input
          type="range"
          class="budget-slider"
          :min="sliderMin"
          :max="sliderMax"
          :step="sliderStep"
          v-model.number="budget"
        />
        <div class="slider-ticks">
          <span>{{ currencySymbol }}{{ sliderMin.toLocaleString() }}</span>
          <span>{{ currencySymbol }}{{ sliderMax.toLocaleString() }}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Recommended Restocking ({{ recommendedCart.length }} items)</h3>
          <button
            class="place-order-btn"
            :disabled="!recommendedCart.length || submitting"
            @click="handlePlaceOrder"
          >
            {{ submitting ? 'Submitting...' : 'Place Order' }}
          </button>
        </div>

        <div v-if="successMessage" class="success-banner">{{ successMessage }}</div>

        <div v-if="!recommendedCart.length" class="empty">
          Budget too low to restock any forecasted item. Increase the budget above to see recommendations.
        </div>

        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item</th>
                <th>Category</th>
                <th>Forecasted Demand</th>
                <th>Unit Cost</th>
                <th>Quantity</th>
                <th>Subtotal</th>
                <th>Lead Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in recommendedCart" :key="item.item_sku">
                <td><strong>{{ item.item_sku }}</strong></td>
                <td>{{ item.item_name }}</td>
                <td><span class="category-tag">{{ item.category }}</span></td>
                <td>{{ item.forecasted_demand }}</td>
                <td>{{ currencySymbol }}{{ item.unit_cost.toFixed(2) }}</td>
                <td><strong>{{ item.quantity }}</strong></td>
                <td><strong>{{ currencySymbol }}{{ (item.quantity * item.unit_cost).toLocaleString(undefined, { maximumFractionDigits: 2 }) }}</strong></td>
                <td>{{ leadTimeFor(item.category) }} days</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6"><strong>Total</strong></td>
                <td><strong>{{ currencySymbol }}{{ allocatedTotal.toLocaleString(undefined, { maximumFractionDigits: 2 }) }}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div v-if="skippedItems.length" class="card">
        <div class="card-header">
          <h3 class="card-title skipped-title">Skipped ({{ skippedItems.length }} items)</h3>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item</th>
                <th>Forecasted Demand</th>
                <th>Full Cost</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in skippedItems" :key="item.item_sku">
                <td><strong>{{ item.item_sku }}</strong></td>
                <td>{{ item.item_name }}</td>
                <td>{{ item.forecasted_demand }}</td>
                <td>{{ currencySymbol }}{{ (item.forecasted_demand * item.unit_cost).toLocaleString(undefined, { maximumFractionDigits: 2 }) }}</td>
                <td><span class="skip-reason">Would exceed budget</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { useI18n } from '../composables/useI18n'
import { useSubmittedOrders } from '../composables/useSubmittedOrders'

// Demand forecast items aren't in the inventory table, so unit cost and
// category have to be derived locally. SKU prefix is the only signal.
const SKU_PREFIX_META = {
  WDG: { category: 'Actuators',   unit_cost: 15.00 },
  BRG: { category: 'Actuators',   unit_cost: 32.50 },
  GSK: { category: 'Actuators',   unit_cost:  8.75 },
  MTR: { category: 'Actuators',   unit_cost: 450.00 },
  FLT: { category: 'Actuators',   unit_cost: 12.25 },
  VLV: { category: 'Actuators',   unit_cost: 185.00 },
  PSU: { category: 'Controllers', unit_cost: 65.00 },
  SNR: { category: 'Sensors',     unit_cost: 89.50 },
  CTL: { category: 'Controllers', unit_cost: 145.00 },
  PCB: { category: 'Circuit Boards', unit_cost: 29.99 }
}

const DEFAULT_META = { category: 'Actuators', unit_cost: 25.00 }

const metaForSku = (sku) => {
  const prefix = (sku || '').split('-')[0]
  return SKU_PREFIX_META[prefix] || DEFAULT_META
}

export default {
  name: 'Restocking',
  setup() {
    const { currentCurrency } = useI18n()
    const { submitOrder, leadTimeFor } = useSubmittedOrders()

    const currencySymbol = computed(() => currentCurrency.value === 'JPY' ? '¥' : '$')

    const loading = ref(true)
    const error = ref(null)
    const forecasts = ref([])
    const budget = ref(0)
    const submitting = ref(false)
    const successMessage = ref('')

    // Forecasts enriched with cost + category, sorted by forecasted_demand desc
    // (the chosen recommendation strategy). Computed so it survives data reload.
    const prioritizedForecasts = computed(() => {
      return [...forecasts.value]
        .map(f => {
          const meta = metaForSku(f.item_sku)
          return {
            ...f,
            category: meta.category,
            unit_cost: meta.unit_cost,
            full_cost: f.forecasted_demand * meta.unit_cost
          }
        })
        .sort((a, b) => b.forecasted_demand - a.forecasted_demand)
    })

    const minItemCost = computed(() => {
      if (!prioritizedForecasts.value.length) return 0
      return Math.min(...prioritizedForecasts.value.map(f => f.full_cost))
    })

    const maxTotalCost = computed(() =>
      prioritizedForecasts.value.reduce((sum, f) => sum + f.full_cost, 0)
    )

    // Slider bounds derived from data so the range is always meaningful.
    const sliderMin = computed(() => Math.max(1000, Math.floor(minItemCost.value / 1000) * 1000))
    const sliderMax = computed(() => Math.ceil(maxTotalCost.value / 1000) * 1000)
    const sliderStep = computed(() => {
      const range = sliderMax.value - sliderMin.value
      return Math.max(500, Math.round(range / 200 / 100) * 100)
    })

    // Greedy fill: walk priority order, take each item's full forecasted
    // quantity if it fits, otherwise skip. Stops scanning past first overflow
    // would change behavior — we keep scanning so a cheap item below an
    // expensive one can still be picked up.
    const allocation = computed(() => {
      const cart = []
      const skipped = []
      let remaining = budget.value

      for (const item of prioritizedForecasts.value) {
        if (item.full_cost <= remaining) {
          cart.push({ ...item, quantity: item.forecasted_demand })
          remaining -= item.full_cost
        } else {
          skipped.push(item)
        }
      }

      return { cart, skipped, remaining }
    })

    const recommendedCart = computed(() => allocation.value.cart)
    const skippedItems = computed(() => allocation.value.skipped)
    const remaining = computed(() => allocation.value.remaining)
    const allocatedTotal = computed(() => budget.value - allocation.value.remaining)

    const loadForecasts = async () => {
      try {
        loading.value = true
        forecasts.value = await api.getDemandForecasts()
        // Default budget at ~30% of full forecast cost — enough to see
        // some items recommended on first load without filling the cart.
        budget.value = Math.round(maxTotalCost.value * 0.3 / sliderStep.value) * sliderStep.value
      } catch (err) {
        error.value = 'Failed to load demand forecasts: ' + err.message
      } finally {
        loading.value = false
      }
    }

    const handlePlaceOrder = async () => {
      if (!recommendedCart.value.length) return
      submitting.value = true
      successMessage.value = ''
      try {
        const order = submitOrder(recommendedCart.value)
        successMessage.value = `Order ${order.order_number} submitted. Expected delivery in ${order.lead_time_days} days. View it under Orders → Submitted Orders.`
      } finally {
        submitting.value = false
      }
    }

    onMounted(loadForecasts)

    return {
      loading,
      error,
      forecasts,
      budget,
      submitting,
      successMessage,
      recommendedCart,
      skippedItems,
      remaining,
      allocatedTotal,
      minItemCost,
      sliderMin,
      sliderMax,
      sliderStep,
      currencySymbol,
      leadTimeFor,
      handlePlaceOrder
    }
  }
}
</script>

<style scoped>
.budget-card {
  padding: var(--space-6);
}

.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--space-6);
  margin-bottom: var(--space-6);
}

.budget-label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-tertiary);
  margin-bottom: var(--space-1);
}

.budget-value {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1;
}

.budget-stats {
  display: flex;
  gap: var(--space-6);
}

.budget-stat-label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-tertiary);
  margin-bottom: var(--space-1);
}

.budget-stat-value {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
}

.budget-stat-value.low {
  color: var(--status-warning);
}

.budget-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: pointer;
}

.budget-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid var(--surface-0);
  box-shadow: var(--shadow-sm);
  transition: background 0.15s ease;
}

.budget-slider::-webkit-slider-thumb:hover {
  background: var(--accent-hover);
}

.budget-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid var(--surface-0);
  box-shadow: var(--shadow-sm);
}

.slider-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.place-order-btn {
  background: var(--accent);
  color: white;
  border: none;
  padding: var(--space-2) var(--space-5);
  font-size: var(--text-sm);
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease;
}

.place-order-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.place-order-btn:disabled {
  background: var(--border-default);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.success-banner {
  background: var(--status-success-bg);
  border: 1px solid var(--status-success);
  color: var(--status-success);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
}

.empty {
  padding: 3rem;
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.category-tag {
  display: inline-block;
  background: var(--surface-2);
  color: var(--text-secondary);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 500;
}

.skip-reason {
  color: var(--text-tertiary);
  font-size: var(--text-xs);
}

.skipped-title {
  color: var(--text-secondary);
}

tfoot td {
  background: var(--surface-1);
  font-size: var(--text-sm);
  font-weight: 600;
}
</style>
