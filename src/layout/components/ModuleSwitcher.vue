<template>
  <div v-if="mode === 'rail'" class="module-rail">
    <a-tooltip v-for="item in modules" :key="item.code" :content="item.name" position="right">
      <div
        class="module-rail__item"
        :class="{ 'module-rail__item--active': item.code === currentModuleCode }"
        @click="onSelect(item.code)"
      >
        <GiSvgIcon :name="item.icon || 'apps'" :size="22" />
        <p class="module-rail__item__title gi_line_1">{{ item.name }}</p>
      </div>
    </a-tooltip>
  </div>
  <a-dropdown v-else trigger="click" @select="onSelect">
    <a-button class="module-switcher__btn" type="text">
      <template #icon>
        <GiSvgIcon :name="currentModule?.icon || 'apps'" :size="18" />
      </template>
      <span class="module-switcher__name gi_line_1">{{ currentModule?.name || '选择模块' }}</span>
      <icon-down />
    </a-button>
    <template #content>
      <a-doption
        v-for="item in modules"
        :key="item.code"
        :value="item.code"
        :class="{ 'module-switcher__option--active': item.code === currentModuleCode }"
      >
        <GiSvgIcon :name="item.icon || 'apps'" :size="16" />
        <span style="margin-left: 8px">{{ item.name }}</span>
      </a-doption>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRouteStore } from '@/stores'

defineOptions({ name: 'ModuleSwitcher' })

withDefaults(defineProps<Props>(), { mode: 'dropdown' })

interface Props {
  /** 展示模式：下拉（顶栏/侧边栏）或图标栏（columns 布局） */
  mode?: 'dropdown' | 'rail'
}

const router = useRouter()
const routeStore = useRouteStore()
const { modules, currentModule, currentModuleCode } = storeToRefs(routeStore)

const onSelect = (code: string) => {
  const home = routeStore.switchModule(code)
  if (home) {
    router.push(home)
  }
}
</script>

<style scoped lang="scss">
.module-switcher {
  &__btn {
    max-width: 180px;
  }

  &__name {
    margin: 0 4px;
    font-weight: 600;
  }

  &__option--active {
    color: rgb(var(--primary-6));
  }
}

.module-rail {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 68px;
  height: 100%;
  padding: 4px;
  overflow: hidden auto;
  background-color: var(--color-bg-1);
  border-right: 1px solid var(--color-border-2);

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 0;
    margin-bottom: 4px;
    cursor: pointer;
    border-radius: 4px;

    &--active {
      color: rgb(var(--primary-6));
      background-color: var(--color-primary-light-2);
    }

    &:not(.module-rail__item--active):hover {
      background-color: var(--color-fill-2);
    }

    &__title {
      box-sizing: border-box;
      padding: 0 4px;
      margin-top: 8px;
      font-size: 12px;
      line-height: 1;
      text-align: center;
    }
  }
}
</style>
