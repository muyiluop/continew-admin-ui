<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 1040 ? 1040 : '100%'"
    :body-style="{ padding: '16px 20px' }"
    draggable
    @before-ok="save"
    @close="reset"
  >
    <a-form ref="formRef" :model="form" :rules="rules" auto-label-width>
      <a-row :gutter="16">
        <a-col :xs="24" :sm="10">
          <a-form-item field="name" label="名称">
            <a-input v-model="form.name" placeholder="请输入名称" />
          </a-form-item>
        </a-col>
        <a-col :xs="12" :sm="7">
          <a-form-item label="排序" field="sort">
            <a-input-number v-model="form.sort" placeholder="请输入排序" :min="1" mode="button" />
          </a-form-item>
        </a-col>
        <a-col :xs="12" :sm="7">
          <a-form-item field="status" label="状态">
            <a-switch
              v-model="form.status" type="round" :checked-value="1" :unchecked-value="2" checked-text="启用"
              unchecked-text="禁用"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="描述" field="description">
        <a-textarea
          v-model="form.description"
          placeholder="请输入描述"
          show-word-limit
          :max-length="200"
          :auto-size="{ minRows: 2, maxRows: 3 }"
        />
      </a-form-item>
    </a-form>

    <!-- 菜单授权：左模块栏 + 右「菜单 + 权限」表格 -->
    <div class="menu-section">
      <div class="menu-section__header">
        <span class="menu-section__title">菜单授权</span>
        <a-space :size="16">
          <a-button size="small" @click="onToggleExpand">
            <template #icon>
              <icon-list v-if="isAllExpanded" />
              <icon-mind-mapping v-else />
            </template>
            {{ isAllExpanded ? '收起全部' : '展开全部' }}
          </a-button>
          <a-checkbox v-model="form.menuCheckStrictly">父子联动</a-checkbox>
        </a-space>
      </div>
      <div class="menu-section__body">
        <ModuleTabs v-model="moduleId" :modules="tabModules" />
        <div class="menu-section__table">
          <a-table
            v-if="tableData.length > 0"
            :expanded-keys="expandedKeys"
            row-key="id"
            :data="tableData"
            :columns="columns"
            :pagination="false"
            :scroll="{ y: 360 }"
            :bordered="{ cell: false }"
            @expanded-change="onExpandedChange"
          >
            <template #titleTitle>
              <a-space :size="12">
                <a-checkbox
                  :model-value="isAllChecked" :indeterminate="isIndeterminate" @change="onSelectAll"
                >
                  全选
                </a-checkbox>
                <span class="menu-table__col-title">菜单</span>
              </a-space>
            </template>
            <template #title="{ record }">
              <a-checkbox :model-value="isChecked(record.id)" @change="(checked) => toggleRow(record, checked)" />
              <span class="menu-table__title">{{ record.title }}</span>
            </template>
            <template #permissions="{ record }">
              <a-space :size="16" wrap>
                <a-checkbox
                  v-for="item in record.permissions"
                  :key="item.key"
                  :model-value="isChecked(item.key)"
                  @change="(checked) => togglePermission(record, item, checked)"
                >
                  {{ item.title }}
                </a-checkbox>
              </a-space>
            </template>
          </a-table>
          <a-empty v-else description="该模块下暂无可配置菜单" />
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import type { FormInstance, TableColumnData } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { addTenantPackage, getTenantPackage, listTenantPackageMenu, updateTenantPackage } from '@/apis/tenant/package'
import { type ModuleResp, listModuleDict } from '@/apis/system/module'
import { useResetReactive } from '@/hooks'
import ModuleTabs from '@/components/ModuleTabs/index.vue'

const emit = defineEmits<{
  (e: 'save-success'): void
}>()
const { width } = useWindowSize()

const dataId = ref('')
const visible = ref(false)
const isUpdate = computed(() => !!dataId.value)
const title = computed(() => (isUpdate.value ? '修改套餐' : '新增套餐'))
const formRef = ref<FormInstance>()

/** 未分组模块 ID */
const UNGROUPED_MODULE = '0'

/** 菜单树节点 */
interface MenuTreeNode {
  key: string
  title: string
  moduleId?: string
  permission?: string
  children?: MenuTreeNode[]
}

/** 表格行（末级权限单独放到权限列） */
interface MenuRow {
  id: string
  title: string
  permissions: MenuTreeNode[]
  children?: MenuRow[]
}

const moduleId = ref<string>('')
const allModules = ref<ModuleResp[]>([])
const allMenus = ref<MenuTreeNode[]>([])
// 全局勾选集合：跨模块保留，保存时提交全量
const checkedKeys = ref<Set<string>>(new Set())

const rules: FormInstance['rules'] = {
  name: [{ required: true, message: '请输入名称' }],
  status: [{ required: true, message: '请选择状态' }],
}

const [form, resetForm] = useResetReactive({
  sort: 999,
  menuCheckStrictly: true,
  status: 1,
})

// 展开的行 key：需与表格行 key 类型一致（a-table 内部严格比较），不能统一转字符串
const expandedKeys = ref<Array<string | number>>([])

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

// 各模块已选数量
const selectedByModule = computed(() => {
  const result = new Map<string, number>()
  checkedKeys.value.forEach((id) => {
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

// 转换为「菜单 + 权限」表格行
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

// 行索引：id -> 行、子 id -> 父行、全部可选 id
const rowIndex = computed(() => {
  const rowMap = new Map<string, MenuRow>()
  const parentMap = new Map<string, string>()
  // 行 key 保留原始类型，供 a-table 的展开状态匹配
  const rowIds: Array<string | number> = []
  const allIds: string[] = []
  const walk = (rows: MenuRow[], parentId?: string) => {
    rows.forEach((row) => {
      const id = String(row.id)
      rowMap.set(id, row)
      rowIds.push(row.id)
      allIds.push(id)
      if (parentId) {
        parentMap.set(id, parentId)
      }
      row.permissions.forEach((permission) => {
        const pid = String(permission.key)
        parentMap.set(pid, id)
        allIds.push(pid)
      })
      if (row.children) {
        walk(row.children, id)
      }
    })
  }
  walk(tableData.value)
  return { rowMap, parentMap, rowIds, allIds }
})

const columns: TableColumnData[] = [
  { title: '菜单', dataIndex: 'title', slotName: 'title', titleSlotName: 'titleTitle', width: 240 },
  { title: '权限', dataIndex: 'permissions', slotName: 'permissions' },
]

const isChecked = (id: string | number) => checkedKeys.value.has(String(id))

// 收集某行及其所有后代菜单/权限 ID
const collectRowIds = (row: MenuRow): string[] => [
  String(row.id),
  ...row.permissions.map((permission) => String(permission.key)),
  ...(row.children ?? []).flatMap((child) => collectRowIds(child)),
]

// 由下向上同步父级勾选状态（与角色权限页一致：有任一子项选中则勾选父级）
const syncAncestors = (rowId: string) => {
  let parentId = rowIndex.value.parentMap.get(rowId)
  while (parentId) {
    const parent = rowIndex.value.rowMap.get(parentId)
    if (parent) {
      const hasChecked = (parent.children ?? []).some((child) => checkedKeys.value.has(String(child.id)))
        || parent.permissions.some((permission) => checkedKeys.value.has(String(permission.key)))
      if (hasChecked) {
        checkedKeys.value.add(parentId)
      } else {
        checkedKeys.value.delete(parentId)
      }
    }
    parentId = rowIndex.value.parentMap.get(parentId)
  }
}

// 勾选菜单行
const toggleRow = (row: MenuRow, checked: any) => {
  const isOn = !!checked
  if (form.menuCheckStrictly) {
    collectRowIds(row).forEach((id) => isOn ? checkedKeys.value.add(id) : checkedKeys.value.delete(id))
    syncAncestors(String(row.id))
  } else {
    isOn ? checkedKeys.value.add(String(row.id)) : checkedKeys.value.delete(String(row.id))
  }
}

// 勾选权限
const togglePermission = (row: MenuRow, item: MenuTreeNode, checked: any) => {
  const isOn = !!checked
  isOn ? checkedKeys.value.add(String(item.key)) : checkedKeys.value.delete(String(item.key))
  if (form.menuCheckStrictly) {
    const hasAny = row.permissions.some((permission) => checkedKeys.value.has(String(permission.key)))
    if (hasAny) {
      checkedKeys.value.add(String(row.id))
    } else {
      checkedKeys.value.delete(String(row.id))
    }
    syncAncestors(String(row.id))
  }
}

// 当前模块是否已全部展开
const isAllExpanded = computed(() => {
  const ids = rowIndex.value.rowIds
  return ids.length > 0 && ids.every((id) => expandedKeys.value.includes(id))
})

// 展开/收起当前模块的全部行
const onToggleExpand = () => {
  expandedKeys.value = isAllExpanded.value ? [] : [...rowIndex.value.rowIds]
}

// 表格行展开状态变化（点击展开箭头）
const onExpandedChange = (keys: Array<string | number>) => {
  expandedKeys.value = keys
}

// 当前模块是否已全选
const isAllChecked = computed(() => {
  const ids = rowIndex.value.allIds
  return ids.length > 0 && ids.every((id) => checkedKeys.value.has(id))
})

// 当前模块是否部分选中
const isIndeterminate = computed(() => {
  const ids = rowIndex.value.allIds
  const checkedCount = ids.filter((id) => checkedKeys.value.has(id)).length
  return checkedCount > 0 && checkedCount < ids.length
})

// 全选/取消当前模块（各模块状态由勾选集合推导，切模块自动还原）
const onSelectAll = (checked: any) => {
  rowIndex.value.allIds.forEach((id) => {
    if (checked) {
      checkedKeys.value.add(id)
    } else {
      checkedKeys.value.delete(id)
    }
  })
}

// 当前模块没有可配置菜单时，自动切到第一个非空模块
const ensureModule = () => {
  const current = tabModules.value.find((item) => item.id === moduleId.value)
  if (!current || current.total === 0) {
    moduleId.value = tabModules.value.find((item) => item.total > 0)?.id ?? tabModules.value[0]?.id ?? ''
  }
}

// 展开当前模块全部行
const expandCurrent = () => {
  expandedKeys.value = [...rowIndex.value.rowIds]
}

watch(moduleId, () => {
  if (visible.value) {
    expandCurrent()
  }
})

// 查询模块与菜单树
const fetchData = async () => {
  const [moduleRes, menuRes] = await Promise.all([listModuleDict(), listTenantPackageMenu()])
  allModules.value = moduleRes.data
  allMenus.value = (menuRes.data ?? []) as MenuTreeNode[]
  ensureModule()
}

// 重置
const reset = () => {
  expandedKeys.value = []
  checkedKeys.value = new Set()
  moduleId.value = ''
  formRef.value?.resetFields()
  resetForm()
}

// 保存
const save = async () => {
  try {
    const isInvalid = await formRef.value?.validate()
    if (isInvalid) return false
    form.menuIds = Array.from(checkedKeys.value)
    if (isUpdate.value) {
      await updateTenantPackage(form, dataId.value)
      Message.success('修改成功')
    } else {
      await addTenantPackage(form)
      Message.success('新增成功')
    }
    emit('save-success')
    return true
  } catch (error) {
    return false
  }
}

// 新增
const onAdd = async () => {
  reset()
  await fetchData()
  dataId.value = ''
  visible.value = true
  await nextTick()
  expandCurrent()
}

// 修改
const onUpdate = async (id: string) => {
  reset()
  await fetchData()
  dataId.value = id
  const { data } = await getTenantPackage(id)
  Object.assign(form, data)
  checkedKeys.value = new Set(((data.menuIds ?? []) as unknown as Array<string | number>).map((key) => String(key)))
  visible.value = true
  await nextTick()
  expandCurrent()
}

defineExpose({ onAdd, onUpdate })
</script>

<style lang="scss" scoped>
.menu-section {
  margin-top: 4px;
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: var(--border-radius-medium);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
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

.menu-table__col-title {
  color: var(--color-text-1);
}

.menu-table__title {
  margin-left: 8px;
}
</style>
