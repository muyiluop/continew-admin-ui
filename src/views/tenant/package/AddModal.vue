<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 920 ? 920 : '100%'"
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

    <!-- 菜单授权 -->
    <div class="menu-section">
      <div class="menu-section__header">
        <span class="menu-section__title">菜单授权</span>
        <a-space :size="16">
          <a-checkbox v-model="isMenuExpanded" @change="onExpanded">展开/折叠</a-checkbox>
          <a-checkbox v-model="isMenuCheckAll" @change="onCheckAll">本模块全选</a-checkbox>
          <a-checkbox v-model="form.menuCheckStrictly">父子联动</a-checkbox>
        </a-space>
      </div>
      <div class="menu-section__body">
        <!-- 左侧模块栏 -->
        <ModuleTabs v-model="moduleId" :modules="tabModules" />
        <div class="menu-section__tree">
          <a-tree
            v-if="currentTree.length > 0"
            ref="menuTreeRef"
            :data="currentTree"
            :default-expand-all="isMenuExpanded"
            :check-strictly="!form.menuCheckStrictly"
            checkable
            @check="onCheck"
          />
          <a-empty v-else description="该模块下暂无可配置菜单" />
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import type { FormInstance } from '@arco-design/web-vue'
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
const menuTreeRef = ref()

/** 未分组模块 ID */
const UNGROUPED_MODULE = '0'

/** 菜单树节点 */
interface MenuTreeNode {
  key: string
  title: string
  moduleId?: string
  children?: MenuTreeNode[]
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

const isMenuExpanded = ref(false)
const isMenuCheckAll = ref(false)

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

// 收集树中所有节点 ID
const collectIds = (nodes: MenuTreeNode[]): string[] => nodes
  .flatMap((node) => [String(node.key), ...(node.children ? collectIds(node.children) : [])])

// 当前模块没有可配置菜单时，自动切到第一个非空模块
const ensureModule = () => {
  const current = tabModules.value.find((item) => item.id === moduleId.value)
  if (!current || current.total === 0) {
    moduleId.value = tabModules.value.find((item) => item.total > 0)?.id ?? tabModules.value[0]?.id ?? ''
  }
}

// 从当前渲染的树同步勾选到全局集合（仅覆盖当前模块的节点）
const syncCheckedFromTree = () => {
  const currentIds = collectIds(currentTree.value)
  const nodes = [
    ...(menuTreeRef.value?.getCheckedNodes() ?? []),
    ...(menuTreeRef.value?.getHalfCheckedNodes() ?? []),
  ]
  const checked = nodes.map((node: any) => String(node.key))
  currentIds.forEach((id) => checkedKeys.value.delete(id))
  checked.forEach((id) => checkedKeys.value.add(id))
}

// 用全局集合恢复当前树的勾选状态
const restoreChecked = () => {
  const keys = collectIds(currentTree.value).filter((id) => checkedKeys.value.has(id))
  if (keys.length > 0) {
    menuTreeRef.value?.checkNode(keys, true, true)
  }
}

// 勾选变化
const onCheck = () => {
  syncCheckedFromTree()
}

// 展开/折叠（仅当前模块）
const onExpanded = () => {
  menuTreeRef.value?.expandAll(isMenuExpanded.value)
}

// 本模块全选/取消
const onCheckAll = () => {
  menuTreeRef.value?.checkAll(isMenuCheckAll.value)
  nextTick(syncCheckedFromTree)
}

// 切换模块：恢复该模块的勾选状态
const onModuleChange = () => {
  isMenuCheckAll.value = false
  nextTick(() => {
    if (isMenuExpanded.value) {
      menuTreeRef.value?.expandAll(true)
    }
    restoreChecked()
  })
}

watch(moduleId, () => {
  if (visible.value) {
    onModuleChange()
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
  isMenuExpanded.value = false
  isMenuCheckAll.value = false
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
  onModuleChange()
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
  onModuleChange()
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
    height: 360px;
    overflow: hidden;
  }

  &__tree {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    overflow: auto;
  }
}
</style>
