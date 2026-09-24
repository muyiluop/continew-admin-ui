import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { RouteRecordRaw } from 'vue-router'
import { mapTree, toTreeArray } from 'xe-utils'
import { cloneDeep, omit } from 'lodash-es'
import { constantRoutes, systemRoutes } from '@/router/route'
import { type RouteItem, type RouteModuleItem, getUserRoute } from '@/apis'
import { transformPathToName } from '@/utils'
import { asyncRouteModules } from '@/router/asyncModules'

const layoutComponentMap = {
  Layout: () => import('@/layout/index.vue'),
  ParentView: () => import('@/components/ParentView/index.vue'),
}

/** 将component由字符串转成真正的模块 */
const transformComponentView = (component: string) => {
  return layoutComponentMap[component as keyof typeof layoutComponentMap] || asyncRouteModules[component]
}

/** 固定菜单（不属于任何模块，始终显示，例如个人工作台） */
const fixedMenus = [
  {
    path: '/dashboard/workplace',
    meta: { title: '工作台', icon: 'dashboard', hidden: false },
  },
] as unknown as RouteRecordRaw[]

/**
 * @description 前端来做排序、格式化
 * @params {menus} 后端返回的路由数据，已经根据当前用户角色过滤掉了没权限的路由
 * 1. 对后端返回的路由数据进行排序，格式化
 * 2. 同时将component由字符串转成真正的模块
 * 3. 将模块编码写入 meta，供模块切换与高亮使用
 */
const formatAsyncRoutes = (menus: RouteItem[]) => {
  if (!menus.length) return []

  const pathMap = new Map()
  return mapTree(menus, (item) => {
    pathMap.set(item.id, item.path)

    if (item.children?.length) {
      item.children.sort((a, b) => (a?.sort ?? 0) - (b?.sort ?? 0))
    }

    // 部分子菜单，例如：通知公告新增、查看详情，需要选中其父菜单
    if (item.parentId && item.type === 2 && item.permission) {
      item.activeMenu = pathMap.get(item.parentId)
    }

    return {
      path: item.path,
      name: item.name ?? transformPathToName(item.path),
      component: transformComponentView(item.component),
      redirect: item.redirect,
      meta: {
        title: item.title,
        hidden: item.isHidden,
        keepAlive: item.isCache,
        icon: item.icon,
        showInTabs: item.showInTabs,
        activeMenu: item.activeMenu,
        moduleCode: item.moduleCode ?? '',
      },
    }
  }) as unknown as RouteRecordRaw[]
}

/** 判断路由层级是否大于 2 */
export const isMultipleRoute = (route: RouteRecordRaw) => {
  return route.children?.some((child) => child.children?.length) ?? false
}

/** 路由降级（把三级及其以上的路由转化为二级路由） */
export const flatMultiLevelRoutes = (routes: RouteRecordRaw[]) => {
  return cloneDeep(routes).map((route) => {
    if (!isMultipleRoute(route)) return route

    return {
      ...route,
      children: toTreeArray(route.children).map((item) => omit(item, 'children')) as RouteRecordRaw[],
    }
  })
}

const storeSetup = () => {
  // 所有路由(常驻路由 + 动态路由)
  const routes = ref<RouteRecordRaw[]>([])
  // 动态路由(异步路由)
  const asyncRoutes = ref<RouteRecordRaw[]>([])
  // 当前登录端可见的模块
  const modules = ref<RouteModuleItem[]>([])
  // 当前选中的模块编码
  const currentModuleCode = ref('')
  // 模块编码 -> 该模块的顶级菜单路由
  const routesByModule = ref<Record<string, RouteRecordRaw[]>>({})

  // 当前模块
  const currentModule = computed(() => modules.value.find((m) => m.code === currentModuleCode.value) ?? null)
  // 当前模块的菜单
  const currentModuleMenus = computed(() => routesByModule.value[currentModuleCode.value] ?? [])
  // 侧边栏菜单（固定菜单 + 当前模块菜单）
  const sidebarMenus = computed<RouteRecordRaw[]>(() => [...fixedMenus, ...currentModuleMenus.value])

  // 合并路由
  const setRoutes = (data: RouteRecordRaw[]) => {
    // 合并路由并排序
    routes.value = [...constantRoutes, ...systemRoutes].concat(data)
      .sort((a, b) => (a.meta?.sort ?? 0) - (b.meta?.sort ?? 0))
    asyncRoutes.value = data
  }

  // 按模块编码对顶级路由分组（无模块编码的路由归入第一个模块，兼容存量数据）
  const groupRoutesByModule = (data: RouteRecordRaw[]) => {
    const fallback = modules.value[0]?.code ?? ''
    return data.reduce((map, route) => {
      const code = (route.meta?.moduleCode as string) || fallback
      if (!map[code]) map[code] = []
      map[code].push(route)
      return map
    }, {} as Record<string, RouteRecordRaw[]>)
  }

  // 根据路径反查所属模块（取前缀匹配最长者）
  const findModuleCodeByPath = (path: string): string | undefined => {
    let matched: string | undefined
    let matchedLength = -1
    const walk = (nodes: RouteRecordRaw[]) => {
      nodes.forEach((node) => {
        const nodePath = node.path
        if (nodePath && path.startsWith(nodePath) && nodePath.length > matchedLength) {
          const code = (node.meta?.moduleCode as string) || ''
          if (code) {
            matched = code
            matchedLength = nodePath.length
          }
        }
        if (node.children?.length) walk(node.children)
      })
    }
    walk(asyncRoutes.value)
    return matched
  }

  // 设置当前模块
  const setCurrentModule = (code: string) => {
    if (modules.value.some((m) => m.code === code)) {
      currentModuleCode.value = code
    }
  }

  // 路由变化时同步当前模块
  const syncModuleByPath = (path: string) => {
    const code = findModuleCodeByPath(path)
    if (code) {
      currentModuleCode.value = code
    }
  }

  // 获取模块落点路由
  const getModuleHome = (code: string) => {
    const module = modules.value.find((m) => m.code === code)
    if (module?.homePath) return module.homePath
    return routesByModule.value[code]?.[0]?.path
  }

  // 切换模块，返回该模块的落点路由
  const switchModule = (code: string) => {
    setCurrentModule(code)
    return getModuleHome(code)
  }

  // 生成路由
  const generateRoutes = async (): Promise<RouteRecordRaw[]> => {
    const { data } = await getUserRoute()
    modules.value = data.modules ?? []
    const asyncRouteList = formatAsyncRoutes(data.routes ?? [])
    setRoutes(asyncRouteList)
    routesByModule.value = groupRoutesByModule(asyncRouteList)
    if (!modules.value.some((m) => m.code === currentModuleCode.value)) {
      currentModuleCode.value = modules.value[0]?.code ?? ''
    }
    return flatMultiLevelRoutes(cloneDeep(asyncRouteList))
  }

  return {
    routes,
    asyncRoutes,
    modules,
    currentModuleCode,
    routesByModule,
    currentModule,
    currentModuleMenus,
    sidebarMenus,
    setCurrentModule,
    syncModuleByPath,
    switchModule,
    generateRoutes,
  }
}

export const useRouteStore = defineStore('route', storeSetup, { persist: { paths: ['currentModuleCode'] } })
