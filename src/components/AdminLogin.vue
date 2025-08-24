<template>
  <form @submit.prevent="login" class="bg-white rounded-lg shadow-sm p-6 space-y-4 max-w-sm mx-auto">
    <h2 class="text-xl font-semibold text-center">Login Admin</h2>
    <input
      v-model="secret"
      type="password"
      placeholder="Clave de administrador"
      class="w-full p-3 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
    />
    <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>
    <button
      type="submit"
      :disabled="loading"
      class="w-full py-3 rounded text-white transition"
      :class="loading
        ? 'bg-gray-400 cursor-not-allowed'
        : 'bg-primary hover:bg-primaryDark'"
    >
      {{ loading ? 'Validando…' : 'Entrar' }}
    </button>
  </form>
</template>

<script>
export default {
  name: 'AdminLogin',
  emits: ['login-success'],
  data() {
    return {
      secret: '',
      error: '',
      loading: false
    }
  },
  methods: {
    async login() {
      this.error = ''
      this.loading = true
      try {
        await this.$axios.post('/api/admin/login', { secret: this.secret })
        localStorage.setItem('admin-secret', this.secret)
        this.$emit('login-success')
      } catch {
        this.error = 'Secreto inválido'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>