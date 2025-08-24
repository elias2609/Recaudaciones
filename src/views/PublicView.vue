<template>
  <!-- 1) Contenedor padre centrado y con ancho fijo -->
  <div class="bg-white rounded-lg shadow-sm p-6 mx-auto max-w-3xl space-y-8">

    <!-- 2) Article: ancho completo -->
    <article class="w-full max-w-prose mx-auto space-y-6">
      <h1 class="text-3xl sm:text-4xl font-bold text-center text-primary">
        Ayudemos a Alexi a seguir latiendo
      </h1>

      <img
        src="/images/imagen.jpg"
        alt="Imagen de campaña"
        class="w-full h-48 sm:h-64 object-cover rounded-lg"
      />

      <div class="space-y-4 text-gray-700 text-base sm:text-lg leading-relaxed">
        <p>
          Hace poco nos dieron una noticia que nos cambió la vida: mi papá tiene
          una miocardiopatía dilatada y su corazón ya está muy débil. Los médicos
          nos dijeron que la única manera de darle una nueva oportunidad es
          implantándole un marcapasos resincronizador.
        </p>

        <template v-if="showAll">
          <!-- párrafos adicionales -->
        </template>

        <button
          @click="showAll = !showAll"
          class="text-primary font-medium hover:underline"
        >
          {{ showAll ? 'Ver menos' : 'Ver más' }}
        </button>
      </div>
    </article>

    <!-- 3) Total recaudado -->
    <section class="w-full text-center space-y-3">
      <h2 class="text-xl font-medium">Total recaudado</h2>
      <AmountCounter :amount="fund.totalDonated" :duration="2000" />
    </section>

    <!-- 4) Donaciones -->
    <section class="w-full">
      <h2 class="text-xl font-medium mb-2">Donaciones</h2>
      <DonationList :donations="donations" />
    </section>

    <!-- 5) Cuentas para donar -->
    <section class="w-full space-y-4">
      <h2 class="text-xl font-medium mb-2">Cuentas para donar</h2>
      <AccountsInfo :accounts="accounts" />

      <!-- Botón WhatsApp -->
      <div class="flex justify-center">
        <a
          :href="whatsappLink"
          target="_blank"
          rel="noopener noreferrer"
          class="px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
        >
          Notificar donación por WhatsApp
        </a>
      </div>
    </section>

  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import AmountCounter from '@/components/AmountCounter.vue'
import DonationList from '@/components/DonationList.vue'
import AccountsInfo from '@/components/AccountsInfo.vue'

export default {
  name: 'PublicView',
  components: { AmountCounter, DonationList, AccountsInfo },
  setup() {
    const fund = ref({
      title: '',
      photoUrl: '',
      goalAmount: 0,
      totalDonated: 0
    })
    const donations = ref([])
    const accounts = ref([])
    const showAll = ref(false)
    const showAccounts = ref(false)

    // Carga datos desde el backend
    onMounted(async () => {
      const { data } = await axios.get('/api/fund')
      fund.value = data.fund
      donations.value = data.donations
      accounts.value = data.accounts
    })

    // Número de WhatsApp en formato internacional (sin '+', sin espacios)
    const phoneNumber = '584264834147'

    // Enlace dinámico a WhatsApp con mensaje pre-llenado
    const whatsappLink = computed(() => {
      const text = `Hola, acabo de donar:`
      return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`
    })

    return {
      fund,
      donations,
      accounts,
      showAll,
      showAccounts,
      whatsappLink
    }
  }
}
</script>