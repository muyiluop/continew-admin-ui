<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 600 ? 600 : '100%'"
    draggable
    @before-ok="save"
    @close="reset"
  >
    <a-form ref="formRef" :model="form" :rules="formRules" auto-label-width>
      <a-form-item label="模块名称" field="name">
        <a-input v-model="form.name" placeholder="请输入模块名称" :max-length="30" show-word-limit allow-clear />
      </a-form-item>
      <a-form-item label="模块编码" field="code">
        <a-input v-model="form.code" placeholder="如 system、device，字母开头" :max-length="50" allow-clear />
      </a-form-item>
      <a-form-item label="图标" field="icon">
        <GiIconSelector v-model="form.icon" />
      </a-form-item>
      <a-form-item label="所属端" field="platforms">
        <a-select
          v-model="form.platforms" :options="client_type" multiple allow-clear
          placeholder="留空表示不限端（所有端可见）"
        />
        <template #extra>
          <span>用于控制模块在哪些端可见，例如仅 Android / 小程序 的模块在后台不显示</span>
        </template>
      </a-form-item>
      <a-form-item label="默认路由" field="homePath">
        <a-input v-model="form.homePath" placeholder="切换到该模块时的默认路由，如 /system/user" allow-clear />
      </a-form-item>
      <a-form-item label="排序" field="sort">
        <a-input-number v-model="form.sort" placeholder="请输入排序" :min="1" mode="button" />
      </a-form-item>
      <a-form-item label="状态" field="status">
        <a-switch
          v-model="form.status" type="round" :checked-value="1" :unchecked-value="2" checked-text="启用"
          unchecked-text="禁用"
        />
      </a-form-item>
      <a-form-item label="描述" field="description">
        <a-textarea
          v-model="form.description" placeholder="请输入描述" show-word-limit :max-length="200"
          :auto-size="{ minRows: 2, maxRows: 4 }"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import type { FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { addModule, getModule, updateModule } from '@/apis/system/module'
import { useResetReactive } from '@/hooks'
import { useDict } from '@/hooks/app'

const emit = defineEmits<{
  (e: 'save-success'): void
}>()

const { width } = useWindowSize()
const { client_type } = useDict('client_type')

const dataId = ref('')
const visible = ref(false)
const isUpdate = computed(() => !!dataId.value)
const title = computed(() => (isUpdate.value ? '修改模块' : '新增模块'))
const formRef = ref<FormInstance>()

const [form, resetForm] = useResetReactive({
  icon: '',
  platforms: [] as string[],
  sort: 999,
  status: 1,
})

const formRules = computed<FormInstance['rules']>(() => ({
  name: [{ required: true, message: '请输入模块名称' }],
  code: [
    { required: true, message: '请输入模块编码' },
    { match: /^[a-z][\w-]*$/i, message: '模块编码只能以字母开头，且只能包含字母、数字、下划线和横线' },
  ],
  sort: [{ required: true, message: '请输入排序' }],
}))

// 重置
const reset = () => {
  formRef.value?.resetFields()
  resetForm()
}

// 保存
const save = async () => {
  try {
    const isInvalid = await formRef.value?.validate()
    if (isInvalid) return false
    if (isUpdate.value) {
      await updateModule(form, dataId.value)
      Message.success('修改成功')
    } else {
      await addModule(form)
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
  const { data } = await getModule(id)
  Object.assign(form, data)
  visible.value = true
}

defineExpose({ onAdd, onUpdate })
</script>

<style scoped lang="scss"></style>
