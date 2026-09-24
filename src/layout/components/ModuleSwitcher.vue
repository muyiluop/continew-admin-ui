<template>
  <!-- 图标栏模式（columns 布局） -->
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

  <!-- 下拉面板模式（顶栏/侧边栏） -->
  <a-popover
    v-else
    v-model:popup-visible="popoverVisible"
    trigger="click"
    position="bl"
    :content-style="panelStyle"
    @popup-visible-change="onVisibleChange"
  >
    <button class="module-trigger" :class="{ 'module-trigger--open': popoverVisible }" type="button">
      <span class="module-trigger__icon">
        <GiSvgIcon :name="currentModule?.icon || 'apps'" :size="18" />
      </span>
      <span class="module-trigger__name gi_line_1">{{ currentModule?.name || '选择模块' }}</span>
      <icon-down class="module-trigger__arrow" />
    </button>
    <template #content>
      <div class="module-panel">
        <div class="module-panel__header">
          <span class="module-panel__title">切换模块</span>
          <a-input
            v-if="modules.length > 6" v-model="keyword" size="small" placeholder="搜索模块" allow-clear
            class="module-panel__search"
          >
            <template #prefix><icon-search /></template>
          </a-input>
        </div>
        <div class="module-panel__body">
          <div
            v-for="item in filteredModules"
            :key="item.code"
            class="module-card"
            :class="{ 'module-card--active': item.code === currentModuleCode }"
            @click="onSelect(item.code)"
          >
            <span class="module-card__icon">
              <GiSvgIcon :name="item.icon || 'apps'" :size="18" />
            </span>
            <div class="module-card__info">
              <div class="module-card__name gi_line_1">{{ item.name }}</div>
              <div class="module-card__desc gi_line_1">{{ item.description || item.code }}</div>
            </div>
            <icon-check v-if="item.code === currentModuleCode" class="module-card__check" />
          </div>
          <a-empty v-if="!filteredModules.length" description="未找到模块" />
        </div>
        <div class="module-panel__footer">
          <a-link v-permission="['system:module:list']" class="module-panel__manage" @click="toModuleManage">
            <template #icon><icon-settings /></template>
            模块管理
          </a-link>
        </div>
      </div>
    </template>
  </a-popover>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRouteStore } from '@/stores'

defineOptions({ name: 'ModuleSwitcher' })

withDefaults(defineProps<Props>(), { mode: 'dropdown' })

interface Props {
  /** 展示模式：下拉面板（顶栏/侧边栏）或图标栏（columns 布局） */
  mode?: 'dropdown' | 'rail'
}

const router = useRouter()
const routeStore = useRouteStore()
const { modules, currentModule, currentModuleCode } = storeToRefs(routeStore)

const popoverVisible = ref(false)
const keyword = ref('')

const panelStyle = {
  padding: '0',
  borderRadius: '10px',
  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)',
}

const filteredModules = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return modules.value
  return modules.value.filter((item) => item.name.toLowerCase().includes(kw) || item.code.toLowerCase().includes(kw))
})

const onSelect = (code: string) => {
  const home = routeStore.switchModule(code)
  popoverVisible.value = false
  if (home) {
    router.push(home)
  }
}

const onVisibleChange = (visible: boolean) => {
  if (!visible) {
    keyword.value = ''
  }
}

const toModuleManage = () => {
  popoverVisible.value = false
  router.push('/system/module')
}
</script>

<style scoped lang="scss">
.module-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 220px;
  height: 36px;
  padding: 0 10px;
  cursor: pointer;
  background-color: transparent;
  border: none;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover,
  &--open {
    background-color: var(--color-fill-2);
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: rgb(var(--primary-6));
    background-color: rgba(var(--primary-6), 0.1);
    border-radius: 6px;
  }

  &__name {
    max-width: 150px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-1);
  }

  &__arrow {
    font-size: 12px;
    color: var(--color-text-3);
    transition: transform 0.2s;
  }

  &--open &__arrow {
    transform: rotate(180deg);
  }
}

.module-panel {
  width: 320px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--color-border-2);
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-1);
  }

  &__search {
    width: 140px;
  }

  &__body {
    max-height: 340px;
    padding: 6px;
    overflow: auto;
  }

  &__footer {
    padding: 8px 14px;
    border-top: 1px solid var(--color-border-2);
  }

  &__manage {
    font-size: 13px;
  }
}

.module-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--color-fill-2);
  }

  &--active {
    color: rgb(var(--primary-6));
    background-color: rgba(var(--primary-6), 0.08);
  }

  &__icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: var(--color-text-2);
    background-color: var(--color-fill-2);
    border-radius: 8px;
  }

  &--active &__icon {
    color: rgb(var(--primary-6));
    background-color: rgba(var(--primary-6), 0.12);
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-1);
  }

  &--active &__name {
    color: rgb(var(--primary-6));
  }

  &__desc {
    margin-top: 2px;
    font-size: 12px;
    color: var(--color-text-3);
  }

  &__check {
    flex-shrink: 0;
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
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 0;
    margin-bottom: 4px;
    cursor: pointer;
    border-radius: 6px;

    &--active {
      color: rgb(var(--primary-6));
      background-color: rgba(var(--primary-6), 0.1);

      &::before {
        position: absolute;
        top: 50%;
        left: -4px;
        width: 3px;
        height: 20px;
        content: '';
        background-color: rgb(var(--primary-6));
        border-radius: 2px;
        transform: translateY(-50%);
      }
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
