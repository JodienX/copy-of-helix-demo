<script lang="ts" setup>
defineProps({
  value: {
    type: [Object, String, Number],
    default: 0
  }
})

const emit = defineEmits<{
  change: [state: any]
}>()

function setValue(value: any) {
  emit('change', value)
}
</script>

<template>
  <div>
    <slot name="options" :value="value" :set-value="setValue" />
  </div>
</template>
