<template>
  <div class="relative">
    <!-- Botón para alternar vista -->
    <div class="flex justify-end mb-2">
      <button @click="showFullList = !showFullList"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
        {{ showFullList ? 'Ocultar' : 'Ver todo' }}
      </button>
    </div>

    <!-- Contenedor de donaciones -->
    <div ref="scrollContainer" :class="[
      'space-y-2 px-2 py-1 bg-white rounded border border-border overflow-y-auto',
      showFullList ? 'max-h-full' : 'max-h-48 scroll-smooth'
    ]" @mouseenter="showFullList || stopAutoScroll()" @mouseleave="showFullList || startAutoScroll()">
      <div v-for="(d, i) in displayDonations" :key="i"
        class="flex justify-between items-center p-2 bg-white rounded border border-border">
        <span class="font-medium">{{ d.donorName }}</span>
        <span class="text-sm text-gray-600">${{ d.amount.toFixed(2) }}</span>
      </div>
    </div>

    <!-- Fade inferior -->
    <div v-if="!showFullList"
      class="absolute inset-x-0 bottom-0 h-8 pointer-events-none bg-gradient-to-t from-white to-transparent z-10"></div>

  </div>
</template>
<script>
export default {
  name: 'DonationList',
  props: {
    donations: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      showFullList: false,
      scrollInterval: null
    }
  },
  computed: {
    // 1. Agrupa y suma montos por donorName
    aggregatedDonations() {
      const map = {};
      this.donations.forEach(({ donorName, amount }) => {
        if (!map[donorName]) {
          map[donorName] = 0;
        }
        map[donorName] += amount;
      });
      // Convierte el map en array de objetos
      return Object.entries(map).map(([donorName, amount]) => ({
        donorName,
        amount
      }));
    },
    // 2. Ordena de mayor a menor
    sortedDonations() {
      // clonamos con spread, slice() o Array.from()
      return [...this.aggregatedDonations].sort((a, b) => b.amount - a.amount);
    },

    // 3. Decide qué lista renderizar
    displayDonations() {
      return this.showFullList ? this.sortedDonations : this.donations;
    }
  },
  mounted() {
    this.startAutoScroll();
  },
  beforeUnmount() {
    this.stopAutoScroll();
  },
  methods: {
    startAutoScroll() {
      const container = this.$refs.scrollContainer;
      if (!container) return;

      this.scrollInterval = setInterval(() => {
        if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
          container.scrollTop = 0;
        } else {
          container.scrollBy({ top: 1, behavior: 'smooth' });
        }
      }, 100);
    },
    stopAutoScroll() {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
  }
}
</script>