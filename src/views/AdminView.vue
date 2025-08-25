<template>
  <div class="bg-white rounded-lg shadow-sm p-6 space-y-6 mx-auto max-w-3xl">

    <!-- Login de administrador -->
    <AdminLogin v-if="!isAdmin" @login-success="onLogin" class="max-w-sm mx-auto" />

    <div v-else class="space-y-6">

      <!-- Título y métricas principales -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <h1 class="text-2xl font-semibold">{{ fund.title }}</h1>
        <div class="text-gray-600 flex space-x-4">
          <span>Total recaudado: <strong>${{ (fund.account?.totalRaised ?? 0).toFixed(2) }}</strong></span>
          <span>{{ donations.length }} donaciones</span>
        </div>
      </div>

      <!-- Imagen de campaña -->
      <img src="/images/imagen.jpg" alt="Imagen de campaña" class="w-full h-48 object-cover rounded-lg" />

      <!-- Barra de progreso -->
      <section>
        <ProgressBar :percent="percent" />
      </section>

      <!-- Lista de donaciones con opción de borrar -->
      <section>
        <h2 class="text-lg font-medium mb-2">Donaciones</h2>
        <ul class="space-y-2">
          <li v-for="d in donations" :key="d.id" class="flex justify-between items-center p-3 bg-gray-100 rounded">
            <div>
              <span class="font-medium">{{ d.donorName }}</span>
              <span class="ml-2 text-gray-700">${{ d.amount.toFixed(2) }}</span>
            </div>
            <button @click="removeDonation(d.id)" :disabled="loadingDelete[d.id]"
              class="p-2 text-red-600 hover:text-red-800 disabled:opacity-50" title="Borrar donación">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        </ul>
      </section>

      <!-- Formulario para agregar donación -->
      <section>
        <h2 class="text-lg font-medium mb-2">Agregar Donación</h2>
        <form @submit.prevent="donate" class="space-y-4">
          <input v-model="name" placeholder="Nombre del donante"
            class="w-full p-3 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary" />
          <input v-model.number="amount" type="number" placeholder="Monto"
            class="w-full p-3 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary" />
          <button type="submit" :disabled="loading" class="w-full py-3 rounded text-white transition" :class="loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-primary hover:bg-primaryDark'">
            {{ loading ? 'Cargando…' : 'Agregar Donación' }}
          </button>
        </form>
      </section>

      <!-- Cuentas para donar -->
      <section>
        <h2 class="text-lg font-medium mb-2">Cuentas para donar</h2>
        <AccountsInfo :accounts="account" />
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
    // Estado reactivo
    const fund          = ref({ id: null, name: '', description: '', targetAmount: 0 })
    const donations     = ref([])
    const account       = ref({ totalRaised: 0, remaining: 0 })
    const name          = ref('')
    const amount        = ref(0)
    const loading       = ref(false)
    const isAdmin       = ref(false)
    const loadingDelete = reactive({})
    const errorMsg      = ref('')

    // Cálculo del % recaudado
    const percent = computed(() => {
      return fund.value.targetAmount
        ? ((account.value.totalRaised / fund.value.targetAmount) * 100).toFixed(2)
        : '0'
    })

    // Obtiene el estado actual del fondo
    async function loadData() {
      const res = await axios.get('/api/fund?id=1', {
        headers: { 'Cache-Control': 'no-cache' }
      })
      fund.value      = res.data.fund
      donations.value = res.data.donations
      account.value   = res.data.account
    }

    // Auto-login al montar si hay secreto en LocalStorage
    onMounted(async () => {
      const secret = localStorage.getItem('admin-secret')
      if (secret) {
        try {
          await axios.post(
            '/api/admin/login',
            { secret },
            { headers: { 'Content-Type': 'application/json' } }
          )
          isAdmin.value = true
          await loadData()
        } catch {
          localStorage.removeItem('admin-secret')
        }
      }
    })

    // Callback tras login exitoso desde <AdminLogin>
    function onLogin(secret) {
      localStorage.setItem('admin-secret', secret)
      isAdmin.value = true
      loadData()
    }

    // Crea una donación y actualiza la UI sin volver a invocar GET
    async function donate() {
      loading.value = true
      errorMsg.value = ''

      const secret = localStorage.getItem('admin-secret')
      if (!secret) {
        errorMsg.value = 'Debes iniciar sesión como administrador'
        loading.value = false
        return
      }

      try {
        const { data } = await axios.post(
          '/api/donations',
          {
            fundId:    fund.value.id,
            donorName: name.value.trim(),
            amount:    Number(amount.value)
          },
          {
            headers: {
              'Content-Type':    'application/json',
              'x-admin-secret':  secret
            }
          }
        )

        // Actualiza UI con la nueva donación
        const newDonation = data.donation
        donations.value.push(newDonation)
        account.value.totalRaised += newDonation.amount
        account.value.remaining   -= newDonation.amount

        name.value   = ''
        amount.value = 0

      } catch (err) {
        const status = err.response?.status
        if (status === 400) {
          errorMsg.value = 'Por favor completa todos los campos'
        } else if (status === 401) {
          errorMsg.value = 'No autorizado: revisa tu clave de administrador'
        } else {
          errorMsg.value = 'Error interno. Intenta más tarde'
          console.error(err)
        }
      } finally {
        loading.value = false
      }
    }

    // Elimina una donación y ajusta totales en la UI
    async function removeDonation(id) {
      loadingDelete[id] = true
      const secret = localStorage.getItem('admin-secret')

      try {
        await axios.delete(
          `/api/donations/${id}`,
          { headers: { 'x-admin-secret': secret } }
        )

        const idx = donations.value.findIndex(d => d.id === id)
        if (idx !== -1) {
          const [removed] = donations.value.splice(idx, 1)
          account.value.totalRaised -= removed.amount
          account.value.remaining   += removed.amount
        }
      } catch (err) {
        console.error(err)
      } finally {
        loadingDelete[id] = false
      }
    }

    return {
      fund,
      donations,
      account,
      name,
      amount,
      loading,
      isAdmin,
      percent,
      errorMsg,
      loadingDelete,
      onLogin,
      donate,
      removeDonation,
      loadData
    }
  }
}
</script>

<style scoped>
/* Estilos opcionales si deseas ajustar colores o espacios */
</style>