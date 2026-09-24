<template>
  <div v-if="!isMobile" class="module-tabs">
    <a-scrollbar style="height: 100%; overflow: auto">
      <ul class="module-tabs__list">
        <li
          v-for="item in modules"
          :key="item.id"
          class="module-tabs__item"
          :class="{
            'module-tabs__item--active': item.id === modelValue,
            'module-tabs__item--empty': item.total === 0,
          }"
          :title="item.total === 0 ? '该模块下暂无可配置菜单' : item.name"
          @click="onSelect(item)"
        >
          <GiSvgIcon :name="item.icon || 'apps'" :size="16" />
          <span class="module-tabs__name gi_line_1">{{ item.name }}</span>
          <span class="module-tabs__badge" :class="{ 'is-selected': item.selected > 0 }">
            {{ item.selected }}/{{ item.total }}
          </span>
        </li>
      </ul>
    </a-scrollbar>
  </div>
  <a-select
    v-else v-model="selected" :options="selectOptions" placeholder="请选择模块" class="module-tabs__select"
  />
</template>

<script setup lang="ts">
import { useDevice } from '@/hooks'

defineOptions({ name: 'ModuleTabs' })

const props = withDefaults(defineProps<Props>(), { modelValue: '' })

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

interface ModuleTabItem {
  id: string
  name: string
  icon?: string
  /** 该模块可勾选总数 */
  total: number
  /** 该模块已选数量 */
  selected: number
}

interface Props {
  /** 当前模块 ID */
  modelValue?: string
  /** 模块列表（含空模块，空模块置灰不可选） */
  modules: ModuleTabItem[]
}

const { isMobile } = useDevice()

const selected = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const selectOptions = computed(() => props.modules
  .filter((item) => item.total > 0)
  .map((item) => ({ label: `${item.name}（${item.selected}/${item.total}）`, value: item.id })))

const onSelect = (item: ModuleTabItem) => {
  if (item.total === 0) {
    return
  }
  emit('update:modelValue', item.id)
  emit('change', item.id)
}
</script>

<style scoped lang="scss">
.module-tabs {
  box-sizing: border-box;
  flex-shrink: 0;
  width: 168px;
  height: 100%;
  overflow: hidden;
  background-color: var(--color-bg-1);
  border-right: 1px solid var(--color-border-2);

  &__list {
    padding: 8px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 40px;
    padding: 0 10px;
    margin-bottom: 4px;
    cursor: pointer;
    border-radius: var(--border-radius-medium);
    transition: background-color 0.2s;

    &:not(.module-tabs__item--active):not(.module-tabs__item--empty):hover {
      background-color: var(--color-fill-2);
    }

    &--active {
      font-weight: 600;
      color: rgb(var(--primary-6));
      background-color: rgba(var(--primary-6), 0.1);
    }

    &--empty {
      cursor: not-allowed;
      color: var(--color-text-4);

      .module-tabs__badge {
        color: var(--color-text-4);
      }
    }
  }

  &__name {
    flex: 1;
    min-width: 0;
    font-size: 14px;
  }

  &__badge {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--color-text-3);

    &.is-selected {
      color: rgb(var(--primary-6));
    }
  }

  &__select {
    width: 100%;
  }
}
</style>
