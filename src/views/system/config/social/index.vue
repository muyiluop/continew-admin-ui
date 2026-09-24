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
      :disabled-column-keys="['name']"
      @refresh="search"
    >
      <template #toolbar-left>
        <a-input-search v-model="queryForm.description" placeholder="搜索名称/描述" allow-clear @search="search" />
        <a-button @click="reset">
          <template #icon><icon-refresh /></template>
          <template #default>重置</template>
        </a-button>
      </template>
      <template #toolbar-right>
        <a-button v-permission="['social:config:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button>
      </template>
      <template #status="{ record }">
        <a-switch
          v-model="record.status"
          :checked-value="1"
          :unchecked-value="2"
          :disabled="!has.hasPerm('social:config:updateStatus')"
          @change="onUpdateStatus(record)"
        />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['social:config:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['social:config:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-link v-permission="['social:config:delete']" status="danger" title="删除" @click="onDelete(record)">
            删除
          </a-link>
        </a-space>
      </template>
    </GiTable>

    <AddDrawer ref="AddDrawerRef" @save-success="search" />
    <DetailDrawer ref="DetailDrawerRef" />
  </GiPageLayout>
</template>

<script setup lang="ts">
import type { TableInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import AddDrawer from './AddDrawer.vue'
import DetailDrawer from './DetailDrawer.vue'
import {
  type SocialConfigQuery,
  type SocialConfigResp,
  deleteSocialConfig,
  listSocialConfig,
  updateSocialConfigStatus,
} from '@/apis/social'
import { useTable } from '@/hooks'
import { isMobile } from '@/utils'
import has from '@/utils/has'

defineOptions({ name: 'SystemSocialConfig' })

const queryForm = reactive<SocialConfigQuery>({
  sort: ['createTime,desc'],
})

const {
  tableData: dataList,
  loading,
  pagination,
  search,
  handleDelete,
} = useTable((page) => listSocialConfig({ ...queryForm, ...page }), { immediate: true })
const columns: TableInstance['columns'] = [
  {
    title: '序号',
    width: 66,
    align: 'center',
    render: ({ rowIndex }) => h('span', {}, rowIndex + 1 + (pagination.current - 1) * pagination.pageSize),
    fixed: !isMobile() ? 'left' : undefined,
  },
  {
    title: '平台',
    dataIndex: 'name',
    minWidth: 140,
    ellipsis: true,
    tooltip: true,
    fixed: !isMobile() ? 'left' : undefined,
  },
  { title: '平台标识', dataIndex: 'source', width: 150 },
  { title: 'Client ID', dataIndex: 'clientId', minWidth: 200, ellipsis: true, tooltip: true },
  { title: '排序', dataIndex: 'sort', width: 80, align: 'center' },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 80, align: 'center' },
  { title: '描述', dataIndex: 'description', minWidth: 140, ellipsis: true, tooltip: true },
  { title: '创建人', dataIndex: 'createUserString', width: 140, ellipsis: true, tooltip: true, show: false },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  { title: '修改人', dataIndex: 'updateUserString', width: 140, ellipsis: true, tooltip: true, show: false },
  { title: '修改时间', dataIndex: 'updateTime', width: 180, show: false },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 170,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['social:config:get', 'social:config:update', 'social:config:delete']),
  },
]

// 重置
const reset = () => {
  queryForm.description = undefined
  search()
}

// 删除
const onDelete = (record: SocialConfigResp) => {
  return handleDelete(() => deleteSocialConfig(record.id), {
    content: `是否确定删除平台配置「${record.name}」？`,
    showModal: true,
  })
}

// 修改状态
const onUpdateStatus = (record: SocialConfigResp) => {
  const msg = record.status === 1 ? '启用成功' : '禁用成功'
  updateSocialConfigStatus({ status: record.status }, record.id)
    .then(() => {
      Message.success(msg)
    })
    .catch(() => {
      record.status = record.status === 1 ? 2 : 1
    })
}

const AddDrawerRef = ref<InstanceType<typeof AddDrawer>>()
// 新增
const onAdd = () => {
  AddDrawerRef.value?.onAdd()
}

// 修改
const onUpdate = (record: SocialConfigResp) => {
  AddDrawerRef.value?.onUpdate(record.id)
}

const DetailDrawerRef = ref<InstanceType<typeof DetailDrawer>>()
// 详情
const onDetail = (record: SocialConfigResp) => {
  DetailDrawerRef.value?.onOpen(record.id)
}
</script>
