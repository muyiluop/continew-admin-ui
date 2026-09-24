<!--
  @file LayoutMix 组件
  @description 混合布局：顶栏为模块切换器，左侧为当前模块的菜单
-->
<template>
  <div class="layout-mix">
    <!-- 左侧菜单区域 -->
    <section
      v-if="isDesktop" class="layout-mix-left" :class="{ 'app-menu-dark': appStore.menuDark }"
      :style="appStore.menuDark ? appStore.themeCSSVar : undefined"
    >
      <Logo :collapsed="appStore.menuCollapse" />
      <Menu :menus="sidebarMenus" :menu-style="{ width: '200px', flex: 1 }" />
      <WwAds class="ads" />
    </section>

    <!-- 右侧内容区域 -->
    <section class="layout-mix-right">
      <header class="header">
        <MenuFoldBtn />
        <ModuleSwitcher class="header-module" />
        <div class="header-spacer" />
        <HeaderRightBar />
      </header>
      <Tabs v-if="appStore.tab" />
      <Main />
      <GiFooter v-if="appStore.copyrightDisplay" />
    </section>

    <!-- 公告弹窗 -->
    <NoticePopup ref="noticePopupRef" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import HeaderRightBar from './components/HeaderRightBar/index.vue'
import Logo from './components/Logo.vue'
import Main from './components/Main.vue'
import Menu from './components/Menu/index.vue'
import MenuFoldBtn from './components/MenuFoldBtn.vue'
import ModuleSwitcher from './components/ModuleSwitcher.vue'
import Tabs from './components/Tabs/index.vue'
import { useAppStore, useRouteStore } from '@/stores'
import { useDevice } from '@/hooks'
import { getToken } from '@/utils/auth'

import WwAds from '@/layout/components/WwAds.vue'
import NoticePopup from '@/views/user/message/components/NoticePopup.vue'

/** 组件名称 */
defineOptions({ name: 'LayoutMix' })

const appStore = useAppStore()
const routeStore = useRouteStore()
const { sidebarMenus } = storeToRefs(routeStore)
const { isDesktop } = useDevice()

// 公告弹窗引用
const noticePopupRef = ref<InstanceType<typeof NoticePopup>>()

// 检查并显示未读公告
const checkAndShowNotices = () => {
  const token = getToken()

  // 如果有token，检查未读公告
  if (token) {
    setTimeout(() => {
      noticePopupRef.value?.open()
    }, 1000) // 延迟1秒显示，让页面先加载完成
  }
}
onMounted(() => {
  checkAndShowNotices()
})
</script>

<style lang="scss" scoped>
:deep(.arco-menu-pop) {
  white-space: nowrap;
}

:deep(.arco-menu.arco-menu-vertical.arco-menu-collapsed) {

  // Menu菜单组件修改
  .arco-menu-icon {
    padding: 10px 0;
    margin-right: 0;
  }

  .arco-menu-has-icon {
    justify-content: center;
    padding: 0;
  }

  .arco-menu-title {
    display: none;
  }
}

.layout-mix {
  display: flex;
  align-items: stretch;
  height: 100%;
  overflow: hidden;

  &-left {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--color-bg-1);
    border-right: 1px solid var(--color-border);
  }

  &-right {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
  }
}

.header {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 $padding;
  overflow: hidden;
  color: var(--color-text-1);
  background: var(--color-bg-1);
  border-bottom: 1px solid var(--color-border);

  .header-module {
    margin-left: 8px;
  }

  .header-spacer {
    flex: 1;
  }
}
</style>
