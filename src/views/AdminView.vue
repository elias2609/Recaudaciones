<template>
  <div class="bg-white rounded-lg shadow-sm p-6 space-y-6 mx-auto max-w-3xl">

    <!-- Login de administrador -->
    <AdminLogin
      v-if="!isAdmin"
      @login-success="onLogin"
      class="max-w-sm mx-auto"
    />

    <div v-else class="space-y-6">

      <!-- Título y métricas principales -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <h1 class="text-2xl font-semibold">{{ fund.title }}</h1>
        <div class="text-gray-600 flex space-x-4">
          <span>Total recaudado: <strong>${{ fund.totalDonated.toFixed(2) }}</strong></span>
          <span>{{ donations.length }} donaciones</span>
        </div>
      </div>

      <!-- Imagen de campaña -->
      <img
        src="/images/imagen.jpg"
        alt="Imagen de campaña"
        class="w-full h-48 object-cover rounded-lg"
      />

      <!-- Barra de progreso -->
      <section>
        <ProgressBar :percent="percent" />
      </section>

      <!-- Lista de donaciones con opción de borrar -->
      <section>
        <h2 class="text-lg font-medium mb-2">Donaciones</h2>
        <ul class="space-y-2">
          <li
            v-for="d in donations"
            :key="d.id"
            class="flex justify-between items-center p-3 bg-gray-100 rounded"
          >
            <div>
              <span class="font-medium">{{ d.donorName }}</span>
              <span class="ml-2 text-gray-700">${{ d.amount.toFixed(2) }}</span>
            </div>
            <button
              @click="removeDonation(d.id)"
              :disabled="loadingDelete[d.id]"
              class="p-2 text-red-600 hover:text-red-800 disabled:opacity-50"
              title="Borrar donación"
            >
              <svg xmlns="http://www.w3.org/2000/svg"
                   class="h-5 w-5"
                   fill="none"
                   viewBox="0 0 24 24"
                   stroke="currentColor">
                <path stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </li>
        </ul>
      </section>

      <!-- Formulario para agregar donación -->
      <section>
        <h2 class="text-lg font-medium mb-2">Agregar Donación</h2>
        <form @submit.prevent="donate" class="space-y-4">
          <input
            v-model="name"
            placeholder="Nombre del donante"
            class="w-full p-3 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            v-model.number="amount"
            type="number"
            placeholder="Monto"
            class="w-full p-3 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 rounded text-white transition"
            :class="loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary hover:bg-primaryDark'"
          >
            {{ loading ? 'Cargando…' : 'Agregar Donación' }}
          </button>
        </form>
      </section>

      <!-- Cuentas para donar -->
      <section>
        <h2 class="text-lg font-medium mb-2">Cuentas para donar</h2>
        <AccountsInfo :accounts="accounts" />
      </section>

    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'
import ProgressBar from '@/components/ProgressBar.vue'
import AccountsInfo from '@/components/AccountsInfo.vue'
import AdminLogin from '@/components/AdminLogin.vue'

export default {
  name: 'AdminView',
  components: { ProgressBar, AccountsInfo, AdminLogin },
  setup() {
    const fund        = ref({ title: '', photoUrl: '', goalAmount: 0, totalDonated: 0 })
    const donations   = ref([])
    const accounts    = ref([])
    const name        = ref('')
    const amount      = ref(0)
    const loading     = ref(false)
    const isAdmin     = ref(false)
    const loadingDelete = reactive({})

    // % de recaudación
    const percent = computed(() =>
      fund.value.goalAmount
        ? ((fund.value.totalDonated / fund.value.goalAmount) * 100).toFixed(2)
        : '0'
    )

    // Carga inicial de datos
    async function loadData() {
      const { data } = await axios.get('/api/fund')
      fund.value      = data.fund
      donations.value = data.donations
      accounts.value  = data.accounts
    }

    // Al montar, intenta auto-login
    onMounted(async () => {
      const secret = localStorage.getItem('admin-secret')
      if (secret) {
        try {
          await axios.post('/api/admin/login', { secret })
          isAdmin.value = true
          await loadData()
        } catch {
          localStorage.removeItem('admin-secret')
        }
      }
    })

    // Callback tras login exitoso
    function onLogin(secret) {
      localStorage.setItem('admin-secret', secret)
      isAdmin.value = true
      loadData()
    }

    // Agregar donación
    async function donate() {
      loading.value = true
      try {
        await axios.post(
          '/api/donations',
          { donorName: name.value, amount: amount.value },
          { headers: { 'x-admin-secret': localStorage.getItem('admin-secret') } }
        )
        name.value = ''
        amount.value = 0
        await loadData()
      } finally {
        loading.value = false
      }
    }

    // Borrar donación por ID
    async function removeDonation(id) {
      loadingDelete[id] = true
      try {
        await axios.delete(
          `/api/donations/${id}`,
          { headers: { 'x-admin-secret': localStorage.getItem('admin-secret') } }
        )
        await loadData()
      } finally {
        loadingDelete[id] = false
      }
    }

    return {
      fund,
      donations,
      accounts,
      name,
      amount,
      loading,
      isAdmin,
      percent,
      onLogin,
      donate,
      removeDonation,
      loadingDelete
    }
  }
}
</script>

<style scoped>
/* Estilos opcionales si deseas ajustar colores o espacios */
</style>