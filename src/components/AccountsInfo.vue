<template>
  <div class="max-w-sm mx-auto bg-white shadow-md rounded-lg overflow-hidden">

    <!-- Detalles de la cuenta -->
    <div class="px-6 py-4 space-y-4">
      <div
        v-for="(label, key) in labels"
        :key="key"
        class="flex justify-between items-center"
      >
        <span class="font-medium text-gray-700">{{ label }}:</span>
        <div class="flex items-center space-x-2">
          <span class="text-gray-600">{{ account[key] }}</span>
          <button
            @click="copy(account[key])"
            class="p-1 bg-gray-200 rounded hover:bg-gray-300 transition"
            title="Copiar al portapapeles"
          >
            <svg xmlns="http://www.w3.org/2000/svg"
                 class="h-5 w-5 text-gray-600"
                 fill="none"
                 viewBox="0 0 24 24"
                 stroke="currentColor">
              <path stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16h8M8 12h8m-6 8h6a2 2 0 002-2V6a2 2 0 00-2-2h-8a2 2 0 00-2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AccountCard',
  data() {
    return {
      // Datos de la cuenta ya definidos
      account: {
        bankName:      'Banco Mercantil',
        accountNumber: '0105-0088-5370-8808-7294',
        telefono:      '04264834147',
        cedula:        '12678894'
      },
      // Etiquetas para mostrar junto a cada campo
      labels: {
        bankName:      'Banco',
        accountNumber: 'Número de cuenta',
        telefono:      'Teléfono',
        cedula:        'Cédula'
      }
    }
  },
  methods: {
    async copy(text) {
      // Primer intento: Clipboard API
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text)
          return
        } catch {
          console.warn('Clipboard API falló, usando fallback')
        }
      }
      // Fallback: textarea + execCommand
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try {
        document.execCommand('copy')
      } catch (err) {
        console.error('Fallback copy falló:', err)
      }
      document.body.removeChild(ta)
    }
  }
}
</script>

<style scoped>
/* Ajustes opcionales: */
</style>