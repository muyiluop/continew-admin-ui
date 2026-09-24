<template>
  <a-drawer v-model:visible="visible" title="平台配置详情" :width="width >= 600 ? 600 : '100%'" :footer="false">
    <a-descriptions :column="2" size="large" class="general-description">
      <a-descriptions-item label="ID">{{ dataDetail?.id }}</a-descriptions-item>
      <a-descriptions-item label="平台">{{ dataDetail?.name }}</a-descriptions-item>
      <a-descriptions-item label="平台标识">{{ dataDetail?.source }}</a-descriptions-item>
      <a-descriptions-item label="Client ID" :span="2"><CellCopy :content="dataDetail?.clientId" /></a-descriptions-item>
      <a-descriptions-item label="Client Secret">
        <a-tag v-if="dataDetail?.clientSecretConfigured" color="green">已配置</a-tag>
        <a-tag v-else color="red">未配置</a-tag>
      </a-descriptions-item>
      <a-descriptions-item label="Agent ID">{{ dataDetail?.agentId || '暂无' }}</a-descriptions-item>
      <a-descriptions-item label="回调地址" :span="2">
        {{ dataDetail?.redirectUri || '暂无' }}
        <span style="color: var(--color-text-3); font-size: 12px">（自动生成，无需填写）</span>
      </a-descriptions-item>
      <a-descriptions-item label="授权范围">{{ dataDetail?.scopes || '暂无' }}</a-descriptions-item>
      <a-descriptions-item label="使用 UnionId">{{ dataDetail?.unionId ? '是' : '否' }}</a-descriptions-item>
      <a-descriptions-item label="忽略 state 校验">{{ dataDetail?.ignoreCheckState ? '是' : '否' }}</a-descriptions-item>
      <a-descriptions-item label="排序">{{ dataDetail?.sort }}</a-descriptions-item>
      <a-descriptions-item label="状态">
        <a-tag v-if="dataDetail?.status === 1" color="green">启用</a-tag>
        <a-tag v-else color="red">禁用</a-tag>
      </a-descriptions-item>
      <a-descriptions-item label="扩展配置" :span="2">{{ dataDetail?.extConfig || '暂无' }}</a-descriptions-item>
      <a-descriptions-item label="创建人">{{ dataDetail?.createUserString }}</a-descriptions-item>
      <a-descriptions-item label="创建时间">{{ dataDetail?.createTime }}</a-descriptions-item>
      <a-descriptions-item label="修改人">{{ dataDetail?.updateUserString }}</a-descriptions-item>
      <a-descriptions-item label="修改时间">{{ dataDetail?.updateTime }}</a-descriptions-item>
      <a-descriptions-item label="描述" :span="2">{{ dataDetail?.description || '暂无' }}</a-descriptions-item>
    </a-descriptions>
  </a-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { type SocialConfigDetailResp, getSocialConfig as getDetail } from '@/apis/social'

const { width } = useWindowSize()

const dataId = ref('')
const dataDetail = ref<SocialConfigDetailResp>()
const visible = ref(false)

// 查询详情
const getDataDetail = async () => {
  const { data } = await getDetail(dataId.value)
  dataDetail.value = data
}

// 打开
const onOpen = async (id: string) => {
  dataId.value = id
  await getDataDetail()
  visible.value = true
}

defineExpose({ onOpen })
</script>

<style scoped lang="scss"></style>
