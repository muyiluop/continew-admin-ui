<template>
  <a-drawer
    v-model:visible="visible"
    :title="title"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 600 ? 600 : '100%'"
    @before-ok="save"
    @close="reset"
  >
    <GiForm ref="formRef" v-model="form" :columns="columns" />
  </a-drawer>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { addSocialConfig, getSocialConfig, listSocialSource, updateSocialConfig } from '@/apis/social'
import { type ColumnItem, GiForm } from '@/components/GiForm'
import { useResetReactive } from '@/hooks'
import type { LabelValueState } from '@/types/global'

const emit = defineEmits<{
  (e: 'save-success'): void
}>()

const { width } = useWindowSize()

const dataId = ref('')
const visible = ref(false)
const isUpdate = computed(() => !!dataId.value)
const title = computed(() => (isUpdate.value ? '修改平台配置' : '新增平台配置'))
const formRef = ref<InstanceType<typeof GiForm>>()
const sourceOptions = ref<LabelValueState[]>([])

const [form, resetForm] = useResetReactive({
  status: 1,
  sort: 1,
  unionId: false,
  ignoreCheckState: false,
})

const columns: ColumnItem[] = reactive([
  {
    label: '平台',
    field: 'source',
    type: 'select',
    span: 24,
    required: true,
    disabled: () => isUpdate.value,
    props: {
      options: sourceOptions,
      placeholder: '请选择平台',
      allowSearch: true,
    },
  },
  {
    label: '名称',
    field: 'name',
    type: 'input',
    span: 24,
    required: true,
    props: {
      placeholder: '请输入名称',
      maxLength: 50,
    },
  },
  {
    label: 'Client ID',
    field: 'clientId',
    type: 'input',
    span: 24,
    required: true,
    props: {
      placeholder: '请输入 Client ID',
      maxLength: 255,
    },
  },
  {
    label: 'Client Secret',
    field: 'clientSecret',
    type: 'input-password',
    span: 24,
    required: () => !isUpdate.value,
    props: {
      placeholder: '请输入 Client Secret（修改时留空则不修改）',
      maxLength: 512,
    },
  },
  {
    label: 'Agent ID',
    field: 'agentId',
    type: 'input',
    span: 24,
    props: {
      placeholder: '微信、钉钉等平台需要填写',
      maxLength: 255,
    },
  },
  {
    label: '授权范围',
    field: 'scopes',
    type: 'input',
    span: 24,
    props: {
      placeholder: '多个以英文逗号分隔',
      maxLength: 500,
    },
  },
  {
    label: '使用 UnionId',
    field: 'unionId',
    type: 'switch',
    span: 24,
    props: {
      type: 'round',
      checkedText: '是',
      uncheckedText: '否',
    },
  },
  {
    label: '忽略 state 校验',
    field: 'ignoreCheckState',
    type: 'switch',
    span: 24,
    props: {
      type: 'round',
      checkedText: '是',
      uncheckedText: '否',
    },
  },
  {
    label: '排序',
    field: 'sort',
    type: 'input-number',
    span: 24,
    props: {
      placeholder: '请输入排序',
      min: 1,
    },
  },
  {
    label: '描述',
    field: 'description',
    type: 'textarea',
    span: 24,
    props: {
      placeholder: '请输入描述',
      maxLength: 200,
    },
  },
  {
    label: '状态',
    field: 'status',
    type: 'switch',
    span: 24,
    props: {
      type: 'round',
      checkedValue: 1,
      uncheckedValue: 2,
      checkedText: '启用',
      uncheckedText: '禁用',
    },
  },
])

// 重置
const reset = () => {
  formRef.value?.formRef?.resetFields()
  resetForm()
}

// 保存
const save = async () => {
  try {
    const isInvalid = await formRef.value?.formRef?.validate()
    if (isInvalid) return false
    if (isUpdate.value) {
      await updateSocialConfig(form, dataId.value)
      Message.success('修改成功')
    } else {
      await addSocialConfig(form)
      Message.success('新增成功')
    }
    emit('save-success')
    return true
  } catch (error) {
    return false
  }
}

// 新增
const onAdd = () => {
  reset()
  dataId.value = ''
  visible.value = true
}

// 修改
const onUpdate = async (id: string) => {
  reset()
  dataId.value = id
  const { data } = await getSocialConfig(id)
  Object.assign(form, data)
  visible.value = true
}

onMounted(async () => {
  const { data } = await listSocialSource()
  sourceOptions.value = data
})

defineExpose({ onAdd, onUpdate })
</script>
