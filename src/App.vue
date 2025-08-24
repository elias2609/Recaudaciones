<template>
  <div>
    <nav class="bg-white shadow-md">
      <div class="container mx-auto px-4 py-3 flex justify-between items-center">
        <div class="space-x-4">
          <router-link to="/" class="text-gray-600 hover:text-primary">Pública</router-link>
          <router-link to="/admin" class="text-gray-600 hover:text-primary">Admin</router-link>
        </div>
      </div>
    </nav>
    <main class="container mx-auto px-4 py-6">
      <router-view />
    </main>
  </div>
</template>
<script>
export default { name: 'App' }
</script>