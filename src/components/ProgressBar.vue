<template>
  <div class="space-y-1">
    <div class="w-full bg-border h-4 rounded overflow-hidden">
      <div
        class="h-4 rounded transition-all duration-500"
        :class="percent > 80 ? 'bg-accent' : 'bg-primary'"
        :style="{ width: percent + '%' }"
      ></div>
    </div>
    <p class="text-right text-sm font-medium">{{ percent }}%</p>
  </div>
</template>

<script>
export default {
  name: 'ProgressBar',
  props: {
    percent: {
      type: [Number, String],
      required: true
    }
  }
}
</script>