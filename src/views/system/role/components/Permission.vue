<template>
  <div class="permission-panel">
    <!-- 左侧模块栏 -->
    <ModuleTabs v-model="moduleId" :modules="tabModules" />

    <div class="permission-panel__content">
      <GiTable
        ref="tableRef"
        row-key="id"
        :data="displayData"
        :columns="columns"
        :loading="loading"
        :scroll="{ x: '100%', y: '100%', minWidth: 1000 }"
        :pagination="false"
        :disabled-tools="['fullscreen', 'size', 'setting']"
        :row-selection="disabled ? false : { type: 'checkbox', showCheckedAll: showCheckedAll && !disabled, selectRowKeys: selectedKeys }"
        @select="select"
        @select-all="selectAll"
        @refresh="refresh"
      >
        <template #toolbar-left>
          <a-button v-permission="['system:role:updatePermission']" type="primary" :disabled="disabled" @click="save">
            <template #icon><icon-save /></template>保存权限
          </a-button>
        </template>
        <template #toolbar-right>
          <a-radio-group v-model="isCascade" type="button" :disabled="disabled">
            <a-radio :value="true">节点关联</a-radio>
            <a-radio :value="false">节点独立</a-radio>
          </a-radio-group>
          <a-button @click="onExpanded">
            <template #icon>
              <icon-list v-if="isExpanded" />
              <icon-mind-mapping v-else />
            </template>
            <template #default>
              <span v-if="!isExpanded">展开</span>
              <span v-else>折叠</span>
            </template>
          </a-button>
        </template>
        <template #expand-icon="{ expanded }">
          <IconDown v-if="expanded" />
          <IconRight v-else />
        </template>
        <template #title="{ record }">
          <GiSvgIcon :name="record.icon" :size="15" />
          <span style="margin-left: 5px; vertical-align: middle">{{ record.title }}</span>
        </template>
        <template #permissions="{ record }">
          <div v-if="record.permissions && record.permissions.length > 0">
            <a-checkbox-group v-model="record.checkedPermissions" :disabled="disabled || record.disabled" @change="selectPermission(record)">
              <a-checkbox v-for="permission in record.permissions" :key="permission.id" :value="permission.id">
                {{ permission.title }}
              </a-checkbox>
            </a-checkbox-group>
          </div>
        </template>
      </GiTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { Message, type TableInstance, type TreeNodeData } from '@arco-design/web-vue'
import { isMobile } from '@/utils'
import type GiTable from '@/components/GiTable/index.vue'
import ModuleTabs from '@/components/ModuleTabs/index.vue'
import { useTable } from '@/hooks'
import { type RolePermissionResp, getRole, listRolePermissionTree, updateRolePermission } from '@/apis/system/role'
import { type ModuleResp, listModuleDict } from '@/apis/system/module'
import has from '@/utils/has'

const props = withDefaults(defineProps<Props>(), {
  roleId: '',
})

interface Props {
  roleId: string
}

interface ExtendedRolePermissionResp extends RolePermissionResp {
  checkedPermissions?: (string | number)[]
  isChecked?: boolean
  disabled?: boolean
}

const tableRef = ref<InstanceType<typeof GiTable>>()

/** 未分组模块 ID */
const UNGROUPED_MODULE = '0'

// 模块筛选
const moduleId = ref<string>('')
const allModules = ref<ModuleResp[]>([])

// 是否父子联动
const isCascade = ref(true)
const isExpanded = ref(true)
// 是否禁用
const disabled = ref(false)

// 展开/折叠
const onExpanded = () => {
  isExpanded.value = !isExpanded.value
  tableRef.value?.tableRef?.expandAll(isExpanded.value)
}

/**
 * 递归处理菜单数据，并进行类型转换
 *
 * @param menus 菜单数据
 */
const transformMenu = (menus: RolePermissionResp[]): ExtendedRolePermissionResp[] => {
  return menus.map((item): ExtendedRolePermissionResp => {
    // 如果当前项有子项，递归处理子项
    if (item.children && item.children.length > 0) {
      // 过滤出 permission 不为空的子项
      const permissions = item.children.filter((child) => child.permission).map((child): RolePermissionResp => ({
        id: child.id,
        title: child.title,
        parentId: child.parentId,
        permission: child.permission,
        isChecked: false,
      }))

      // 过滤出 permission 为空的子项
      item.children = item.children.filter((child) => !child.permission)

      // 如果有权限，将其添加到当前项的 permissions 属性中
      if (permissions.length > 0) {
        (item as ExtendedRolePermissionResp).permissions = permissions
        ;(item as ExtendedRolePermissionResp).checkedPermissions = permissions.filter((permission) => permission.isChecked).map((permission) => permission.id)
      }

      // 递归处理剩余的子项
      item.children = transformMenu(item.children)

      // 如果 children 为空数组，移除 children 属性
      if (item.children.length === 0) {
        delete item.children
      }
    }

    return item
  })
}

// 更新表格数据的选中状态
const updateTableDataCheckedStatus = (data: ExtendedRolePermissionResp[], selectedKeys: (string | number)[]) => {
  data.forEach((item) => {
    item.disabled = disabled.value
    // 设置菜单项的选中状态
    item.isChecked = selectedKeys.includes(item.id)
    // 设置权限的选中状态
    if (item.permissions) {
      item.permissions.forEach((permission) => {
        permission.isChecked = selectedKeys.includes(permission.id)
      })
      item.checkedPermissions = item.permissions
        .filter((permission) => selectedKeys.includes(permission.id))
        .map((permission) => permission.id)
    }
    // 递归处理子菜单
    if (item.children) {
      updateTableDataCheckedStatus(item.children as ExtendedRolePermissionResp[], selectedKeys)
    }
  })
}

// 查找指定菜单 - 使用 Map 缓存优化查找性能
const menuMap = ref<Map<string | number, ExtendedRolePermissionResp>>(new Map())

// 构建菜单映射缓存
const buildMenuMap = (data: ExtendedRolePermissionResp[]) => {
  const map = new Map<string | number, ExtendedRolePermissionResp>()

  const traverse = (items: ExtendedRolePermissionResp[]) => {
    items.forEach((item) => {
      map.set(item.id, item)
      if (item.children?.length) {
        traverse(item.children as ExtendedRolePermissionResp[])
      }
    })
  }

  traverse(data)
  menuMap.value = map
}

const selectedKeys = ref<Set<string | number>>(new Set())

const {
  tableData,
  loading,
  search,
} = useTable(() => listRolePermissionTree(), {
  immediate: true,
  formatResult(data: TreeNodeData[]) {
    return transformMenu(data)
  },
  onSuccess: () => {
    nextTick(() => {
      tableRef.value?.tableRef?.expandAll(true)
    })
    // 构建菜单映射缓存
    buildMenuMap(tableData.value as ExtendedRolePermissionResp[])
    // 初始加载时应用已选中的权限
    if (selectedKeys.value.size > 0) {
      updateTableDataCheckedStatus(tableData.value as ExtendedRolePermissionResp[], Array.from(selectedKeys.value))
    }
  },
})

// 菜单 ID 与所属模块 ID 映射（含按钮权限项，按钮跟随其所属菜单）
const idModuleMap = computed(() => {
  const map = new Map<string, string>()
  const walk = (items: ExtendedRolePermissionResp[]) => {
    items.forEach((item) => {
      const mid = String(item.moduleId ?? UNGROUPED_MODULE)
      map.set(String(item.id), mid)
      item.permissions?.forEach((permission) => map.set(String(permission.id), mid))
      if (item.children?.length) {
        walk(item.children as ExtendedRolePermissionResp[])
      }
    })
  }
  walk(tableData.value as ExtendedRolePermissionResp[])
  return map
})

// 各模块可勾选总数
const totalByModule = computed(() => {
  const result = new Map<string, number>()
  idModuleMap.value.forEach((mid) => result.set(mid, (result.get(mid) ?? 0) + 1))
  return result
})

// 各模块已选数量
const selectedByModule = computed(() => {
  const result = new Map<string, number>()
  selectedKeys.value.forEach((id) => {
    const mid = idModuleMap.value.get(String(id))
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

// 当前模块没有可配置菜单时，自动切到第一个非空模块
const ensureModule = () => {
  const current = tabModules.value.find((item) => item.id === moduleId.value)
  if (!current || current.total === 0) {
    moduleId.value = tabModules.value.find((item) => item.total > 0)?.id ?? tabModules.value[0]?.id ?? ''
  }
}

// 模块或菜单数据就绪后校正当前模块
watch(
  () => tabModules.value.map((item) => [item.id, item.total].join(':')).join(','),
  () => ensureModule(),
)

listModuleDict().then((res) => {
  allModules.value = res.data
})

// 按模块筛选后的展示数据
const displayData = computed(() => {
  if (!moduleId.value) return tableData.value
  return (tableData.value as ExtendedRolePermissionResp[])
    .filter((item) => String(item.moduleId ?? UNGROUPED_MODULE) === moduleId.value)
})

const columns: TableInstance['columns'] = [
  { title: '菜单', dataIndex: 'title', slotName: 'title', width: 220, ellipsis: true, tooltip: true, fixed: !isMobile() ? 'left' : undefined },
  { title: '权限', dataIndex: 'permissions', slotName: 'permissions' },
]

// 级联选中子项
const cascadeSelectChild = (record: ExtendedRolePermissionResp, isCascade: boolean) => {
  if (!isCascade) return

  // 批量处理子菜单
  if (record.children && record.children.length > 0) {
    record.children.forEach((child) => {
      const extendedChild = child as ExtendedRolePermissionResp
      extendedChild.isChecked = record.isChecked
      tableRef.value?.tableRef?.select(child.id, extendedChild.isChecked)

      // 使用批量操作优化性能
      if (extendedChild.isChecked) {
        selectedKeys.value.add(child.id)
      } else {
        selectedKeys.value.delete(child.id)
      }

      // 递归处理子项
      if (child.children?.length || extendedChild.permissions?.length) {
        cascadeSelectChild(extendedChild, isCascade)
      }
    })
  }

  // 批量处理权限
  if (record.permissions && record.permissions.length > 0) {
    const checkedPermissions: (string | number)[] = []
    record.permissions.forEach((permission) => {
      permission.isChecked = record.isChecked
      if (permission.isChecked) {
        selectedKeys.value.add(permission.id)
        checkedPermissions.push(permission.id)
      } else {
        selectedKeys.value.delete(permission.id)
      }
    })
    record.checkedPermissions = checkedPermissions
  }
}

// 查找指定菜单
const findItem = (id: string | number): ExtendedRolePermissionResp | null => {
  return menuMap.value.get(id) || null
}

// 级联选中父项目
const cascadeSelectParent = (record: ExtendedRolePermissionResp, isCascade: boolean) => {
  if (!isCascade || !record.parentId || record.parentId === '0') return

  const parent = findItem(record.parentId)
  if (!parent) return

  // 检查父项目的所有子项是否有被选中的
  const hasCheckedChildren = parent.children?.some((child) => (child as ExtendedRolePermissionResp).isChecked)
  parent.isChecked = hasCheckedChildren || false

  // 更新表格选中状态
  tableRef.value?.tableRef?.select(parent.id, parent.isChecked)

  // 更新选中键集合
  if (parent.isChecked) {
    selectedKeys.value.add(parent.id)
  } else {
    selectedKeys.value.delete(parent.id)
  }

  // 递归处理父级的父级
  if (parent.parentId && parent.parentId !== '0') {
    cascadeSelectParent(parent, isCascade)
  }
}

// 选中
const select: TableInstance['onSelect'] = (rowKeys, checked, record) => {
  const extendedRecord = record as ExtendedRolePermissionResp

  // 如果处于禁用状态，直接返回，不执行任何逻辑
  if (disabled.value || extendedRecord.disabled) {
    return
  }

  const isChecked = rowKeys.includes(checked)
  isChecked
    ? selectedKeys.value.add(extendedRecord.id)
    : selectedKeys.value.delete(extendedRecord.id)
  extendedRecord.isChecked = isChecked
  // 级联选中子项
  cascadeSelectChild(extendedRecord, isCascade.value)
  // 级联选中父项
  cascadeSelectParent(extendedRecord, isCascade.value)
}

// 全选（仅当前模块）
const selectAll: TableInstance['onSelectAll'] = (checked) => {
  // 如果处于禁用状态，直接返回，不执行任何逻辑
  if (disabled.value) {
    return
  }

  displayData.value.forEach((item) => {
    const extendedItem = item as ExtendedRolePermissionResp
    extendedItem.isChecked = checked
    checked
      ? selectedKeys.value.add(item.id)
      : selectedKeys.value.delete(item.id)
    cascadeSelectChild(extendedItem, true)
  })
}

// 选中权限
const selectPermission = (record: ExtendedRolePermissionResp) => {
  // 如果处于禁用状态，直接返回，不执行任何逻辑
  if (disabled.value || record.disabled) {
    return
  }

  const checkPermissions = record.checkedPermissions || []
  // 取消选中
  if (checkPermissions.length === 0) {
    if (isCascade.value) {
      record.isChecked = false
      selectedKeys.value.delete(record.id)
      tableRef.value?.tableRef?.select(record.id, record.isChecked)
      cascadeSelectParent(record, isCascade.value)
    }
    record.permissions?.forEach((permission) => {
      permission.isChecked = false
      selectedKeys.value.delete(permission.id)
    })
    return
  }
  // 选中
  if (checkPermissions.length > 0) {
    if (isCascade.value) {
      record.isChecked = true
      selectedKeys.value.add(record.id)
      tableRef.value?.tableRef?.select(record.id, record.isChecked)
      cascadeSelectParent(record, isCascade.value)
    }
    record.permissions?.forEach((permission) => {
      permission.isChecked = checkPermissions.includes(permission.id)
      permission.isChecked
        ? selectedKeys.value.add(permission.id)
        : selectedKeys.value.delete(permission.id)
    })
  }
}

// 保存
const save = async () => {
  await updateRolePermission(props.roleId, {
    menuIds: Array.from(selectedKeys.value),
    menuCheckStrictly: isCascade.value,
  })
  Message.success('保存成功')
}

const showCheckedAll = ref(true)
// 加载角色详情
const fetchRole = async (id: string) => {
  try {
    loading.value = true
    disabled.value = !has.hasPermOr(['system:role:updatePermission'])
    // 查询角色详情
    const { data } = await getRole(id)
    if (!disabled.value) {
      disabled.value = data.isSystem
    }
    isCascade.value = data.menuCheckStrictly
    // 更新选中键集合
    selectedKeys.value = new Set(data.menuIds)
    // 重新构建菜单映射缓存
    buildMenuMap(tableData.value as ExtendedRolePermissionResp[])
    // 更新表格数据的选中状态
    updateTableDataCheckedStatus(tableData.value as ExtendedRolePermissionResp[], data.menuIds)
    // 手动设置表格行的选中状态，确保组件响应
    await nextTick(() => {
      tableRef.value?.tableRef?.selectAll(false)
      tableRef.value?.tableRef?.select(data.menuIds, true)
      showCheckedAll.value = !disabled.value
      ensureModule()
    })
  } finally {
    loading.value = false
  }
}

// 刷新
const refresh = () => {
  search()
  if (props.roleId) {
    fetchRole(props.roleId)
  }
}

// 监听 roleId 的变化
watch(
  () => props.roleId,
  async (newRoleId) => {
    if (newRoleId) {
      await fetchRole(newRoleId)
    }
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.permission-panel {
  display: flex;
  flex: 1;
  height: 100%;
  overflow: hidden;

  &__content {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }
}
</style>
