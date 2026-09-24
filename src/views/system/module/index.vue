<template>
  <GiPageLayout :margin="false" :body-style="{ padding: 0 }">
    <GiTable
      row-key="id"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :scroll="{ x: '100%', y: '100%', minWidth: 1200 }"
      :pagination="pagination"
      :disabled-tools="['size']"
      @refresh="search"
    >
      <template #toolbar-left>
        <a-input v-model="queryForm.name" placeholder="搜索模块名称" allow-clear @press-enter="search" />
        <a-select
          v-model="queryForm.status" :options="DisEnableStatusList" placeholder="请选择状态" allow-clear
          style="width: 150px"
          @change="search"
        />
        <a-button @click="reset">
          <template #icon><icon-refresh /></template>
          <template #default>重置</template>
        </a-button>
      </template>
      <template #toolbar-right>
        <a-button v-permission="['system:module:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button>
      </template>
      <template #name="{ record }">
        <GiSvgIcon :name="record.icon || 'apps'" :size="15" />
        <span style="margin-left: 5px; vertical-align: middle">{{ record.name }}</span>
      </template>
      <template #platforms="{ record }">
        <GiCellTags v-if="record.platforms && record.platforms.length" :data="formatPlatforms(record.platforms)" />
        <span v-else>不限端</span>
      </template>
      <template #status="{ record }">
        <GiCellStatus :status="record.status" />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['system:module:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-link v-permission="['system:module:delete']" status="danger" title="删除" @click="onDelete(record)">
            删除
          </a-link>
        </a-space>
      </template>
    </GiTable>

    <AddModal ref="AddModalRef" @save-success="search" />
  </GiPageLayout>
</template>

<script setup lang="tsx">
import type { TableInstance } from '@arco-design/web-vue'
import AddModal from './AddModal.vue'
import { type ModuleQuery, type ModuleResp, deleteModule, pageModule } from '@/apis/system/module'
import { DisEnableStatusList } from '@/constant/common'
import { useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import GiCellStatus from '@/components/GiCell/GiCellStatus.vue'
import GiCellTags from '@/components/GiCell/GiCellTags.vue'

defineOptions({ name: 'SystemModule' })

const { client_type } = useDict('client_type')

const queryForm = reactive<ModuleQuery>({
  name: '',
  status: undefined,
  sort: ['sort,asc'],
})

// 所属端展示
const formatPlatforms = (platforms: string[]) => platforms.map((item) => {
  const found = client_type.value.find((d: any) => d.value === item)
  return found?.label ?? item
})

const {
  tableData: dataList,
  loading,
  pagination,
  search,
  handleDelete,
} = useTable((page) => pageModule({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  {
    title: '序号',
    width: 66,
    align: 'center',
    render: ({ rowIndex }) => h('span', {}, rowIndex + 1 + (pagination.current - 1) * pagination.pageSize),
    fixed: !isMobile() ? 'left' : undefined,
  },
  { title: '模块名称', dataIndex: 'name', slotName: 'name', width: 180, ellipsis: true, tooltip: true },
  { title: '模块编码', dataIndex: 'code', width: 160, ellipsis: true, tooltip: true },
  { title: '所属端', dataIndex: 'platforms', slotName: 'platforms', align: 'center' },
  { title: '默认路由', dataIndex: 'homePath', ellipsis: true, tooltip: true },
  { title: '排序', dataIndex: 'sort', width: 90, align: 'center' },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 90, align: 'center' },
  { title: '描述', dataIndex: 'description', ellipsis: true, tooltip: true },
  { title: '创建人', dataIndex: 'createUserString', width: 140, ellipsis: true, tooltip: true, show: false },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 140,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['system:module:update', 'system:module:delete']),
  },
]

// 重置
const reset = () => {
  queryForm.name = ''
  queryForm.status = undefined
  search()
}

// 删除
const onDelete = (record: ModuleResp) => {
  return handleDelete(() => deleteModule(record.id), {
    content: `是否确定删除模块「${record.name}」？`,
    showModal: true,
  })
}

const AddModalRef = ref<InstanceType<typeof AddModal>>()
// 新增
const onAdd = () => {
  AddModalRef.value?.onAdd()
}

// 修改
const onUpdate = (record: ModuleResp) => {
  AddModalRef.value?.onUpdate(record.id)
}
</script>

<style scoped lang="scss"></style>
