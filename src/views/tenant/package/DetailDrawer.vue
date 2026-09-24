<template>
  <a-drawer v-model:visible="visible" title="套餐详情" :width="width >= 1040 ? 1040 : '100%'" :footer="false">
    <a-descriptions title="基础信息" :column="2" size="large" class="general-description">
      <a-descriptions-item label="ID" :span="2">
        <a-typography-paragraph copyable>{{ dataDetail?.id }}</a-typography-paragraph>
      </a-descriptions-item>
      <a-descriptions-item label="名称">{{ dataDetail?.name }}</a-descriptions-item>
      <a-descriptions-item label="排序">{{ dataDetail?.sort }}</a-descriptions-item>
      <a-descriptions-item label="状态">
        <a-tag v-if="dataDetail?.status === 1" color="green">启用</a-tag>
        <a-tag v-else color="red">禁用</a-tag>
      </a-descriptions-item>
      <a-descriptions-item />
      <a-descriptions-item label="创建人">{{ dataDetail?.createUserString }}</a-descriptions-item>
      <a-descriptions-item label="创建时间">{{ dataDetail?.createTime }}</a-descriptions-item>
      <a-descriptions-item label="修改人">{{ dataDetail?.updateUserString }}</a-descriptions-item>
      <a-descriptions-item label="修改时间">{{ dataDetail?.updateTime }}</a-descriptions-item>
      <a-descriptions-item label="描述" :span="2">{{ dataDetail?.description }}</a-descriptions-item>
    </a-descriptions>

    <!-- 关联菜单（按模块分组，菜单 + 权限横向铺开） -->
    <div class="menu-section">
      <div class="menu-section__header">
        <span class="menu-section__title">关联菜单</span>
      </div>
      <div class="menu-section__body">
        <ModuleTabs v-model="moduleId" :modules="tabModules" />
        <div class="menu-section__table">
          <a-table
            v-if="tableData.length > 0"
            row-key="id"
            :data="tableData"
            :columns="columns"
            :pagination="false"
            :default-expand-all-rows="true"
            :scroll="{ y: 420 }"
            :bordered="{ cell: false }"
          >
            <template #title="{ record }">
              <span class="menu-table__menu">
                <icon-check-circle-fill v-if="checkedSet.has(String(record.id))" class="menu-table__checked" />
                <icon-circle v-else class="menu-table__circle" />
                <span class="menu-table__name">{{ record.title }}</span>
              </span>
            </template>
            <template #permissions="{ record }">
              <a-space :size="[8, 8]" wrap>
                <a-tag
                  v-for="item in record.permissions"
                  :key="item.key"
                  :color="checkedSet.has(String(item.key)) ? 'arcoblue' : 'gray'"
                  :bordered="false"
                  size="small"
                >
                  {{ item.title }}
                </a-tag>
              </a-space>
            </template>
          </a-table>
          <a-empty v-else description="该模块下暂无菜单" />
        </div>
      </div>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import type { TableColumnData } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { type TenantPackageResp, getTenantPackage as getDetail, listTenantPackageMenu } from '@/apis/tenant/package'
import { type ModuleResp, listModuleDict } from '@/apis/system/module'
import ModuleTabs from '@/components/ModuleTabs/index.vue'

const { width } = useWindowSize()

/** 未分组模块 ID */
const UNGROUPED_MODULE = '0'

/** 菜单树节点 */
interface MenuTreeNode {
  key: string
  title: string
  moduleId?: string
  type?: number
  permission?: string
  children?: MenuTreeNode[]
}

/** 表格行 */
interface MenuRow {
  id: string
  title: string
  permissions: MenuTreeNode[]
  children?: MenuRow[]
}

const dataId = ref('')
const dataDetail = ref<TenantPackageResp>()
const visible = ref(false)

const moduleId = ref<string>('')
const allModules = ref<ModuleResp[]>([])
const allMenus = ref<MenuTreeNode[]>([])

// 已勾选的菜单/权限 ID
const checkedSet = computed(() => {
  const menuIds = (dataDetail.value?.menuIds ?? []) as unknown as Array<string | number>
  return new Set(menuIds.map((id) => String(id)))
})

// 菜单 ID 与所属模块 ID 映射
const idModuleMap = computed(() => {
  const map = new Map<string, string>()
  const walk = (nodes: MenuTreeNode[]) => {
    nodes.forEach((node) => {
      map.set(String(node.key), String(node.moduleId ?? UNGROUPED_MODULE))
      if (node.children?.length) {
        walk(node.children)
      }
    })
  }
  walk(allMenus.value)
  return map
})

// 各模块可配置总数
const totalByModule = computed(() => {
  const result = new Map<string, number>()
  idModuleMap.value.forEach((mid) => result.set(mid, (result.get(mid) ?? 0) + 1))
  return result
})

// 各模块已勾选数量
const selectedByModule = computed(() => {
  const result = new Map<string, number>()
  checkedSet.value.forEach((id) => {
    const mid = idModuleMap.value.get(id)
    if (mid) {
      result.set(mid, (result.get(mid) ?? 0) + 1)
    }
  })
  return result
})

// 模块 Tab 数据（显示全部模块，空模块置灰；未分组固定最后）
const tabModules = computed(() => {
  const list = allModules.value.map((mod) => ({
    id: String(mod.id),
    name: mod.name,
    icon: mod.icon,
    total: totalByModule.value.get(String(mod.id)) ?? 0,
    selected: selectedByModule.value.get(String(mod.id)) ?? 0,
  }))
  list.push({
    id: UNGROUPED_MODULE,
    name: '未分组',
    icon: 'common',
    total: totalByModule.value.get(UNGROUPED_MODULE) ?? 0,
    selected: selectedByModule.value.get(UNGROUPED_MODULE) ?? 0,
  })
  return list
})

// 当前模块的菜单树
const currentTree = computed(() => allMenus.value
  .filter((node) => String(node.moduleId ?? UNGROUPED_MODULE) === moduleId.value))

// 转换为「菜单 + 权限」表格行（带权限标识的子节点归入权限列）
const transform = (nodes: MenuTreeNode[]): MenuRow[] => nodes.map((node) => {
  const children = node.children ?? []
  const permissions = children.filter((child) => child.permission)
  const subMenus = children.filter((child) => !child.permission)
  const row: MenuRow = { id: node.key, title: node.title, permissions }
  if (subMenus.length > 0) {
    row.children = transform(subMenus)
  }
  return row
})

const tableData = computed(() => transform(currentTree.value))

const columns: TableColumnData[] = [
  { title: '菜单', dataIndex: 'title', slotName: 'title', width: 220 },
  { title: '权限', dataIndex: 'permissions', slotName: 'permissions' },
]

// 当前模块没有菜单时，自动切到第一个非空模块
const ensureModule = () => {
  const current = tabModules.value.find((item) => item.id === moduleId.value)
  if (!current || current.total === 0) {
    moduleId.value = tabModules.value.find((item) => item.total > 0)?.id ?? tabModules.value[0]?.id ?? ''
  }
}

// 加载模块与菜单树
const loadData = async () => {
  const [moduleRes, menuRes] = await Promise.all([listModuleDict(), listTenantPackageMenu()])
  allModules.value = moduleRes.data
  allMenus.value = (menuRes.data ?? []) as MenuTreeNode[]
}

// 查询详情
const getDataDetail = async () => {
  const { data } = await getDetail(dataId.value)
  dataDetail.value = data
}

// 打开
const onOpen = async (id: string) => {
  dataId.value = id
  visible.value = true
  await Promise.all([loadData(), getDataDetail()])
  ensureModule()
}

defineExpose({ onOpen })
</script>

<style scoped lang="scss">
.menu-section {
  margin-top: 20px;
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: var(--border-radius-medium);

  &__header {
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 16px;
    background-color: var(--color-fill-1);
    border-bottom: 1px solid var(--color-border-2);
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-1);
  }

  &__body {
    display: flex;
    height: 440px;
    overflow: hidden;
  }

  &__table {
    flex: 1;
    min-width: 0;
    padding: 4px 12px 12px;
    overflow: auto;

    // 单元格顶部对齐：菜单与权限第一行对齐
    :deep(.arco-table-td) {
      vertical-align: top;
    }

    :deep(.arco-table-cell) {
      align-items: flex-start;
    }
  }
}

.menu-table__menu {
  display: inline-flex;
  align-items: center;
}

.menu-table__checked {
  margin-right: 6px;
  color: rgb(var(--primary-6));
}

.menu-table__circle {
  margin-right: 6px;
  color: var(--color-text-4);
}

.menu-table__name {
  color: var(--color-text-1);
}
</style>
