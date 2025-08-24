<template>
  <div class="text-center">
    <span class="text-4xl sm:text-5xl font-bold">
      {{ displayValue.toLocaleString() }}
    </span>
    <span class="text-xl text-gray-600"> $</span>
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue'

export default {
  name: 'AmountCounter',
  props: {
    amount: {
      type: Number,
      required: true
    },
    duration: {
      type: Number,
      default: 2000  // duración en ms del conteo
    }
  },
  setup(props) {
    // valor animado
    const displayValue = ref(0)

    // función de animación con requestAnimationFrame
    const animate = (to) => {
      const from = displayValue.value
      const change = to - from
      const startTime = performance.now()

      const step = (time) => {
        const elapsed = time - startTime
        const progress = Math.min(elapsed / props.duration, 1)
        displayValue.value = Math.floor(from + change * progress)
        if (progress < 1) {
          requestAnimationFrame(step)
        }
      }

      requestAnimationFrame(step)
    }

    // animar al montar y cuando cambie la prop
    onMounted(() => animate(props.amount))
    watch(() => props.amount, (newVal) => animate(newVal))

    return { displayValue }
  }
}
</script>