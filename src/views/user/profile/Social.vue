<template>
  <a-card title="第三方账号" bordered class="gradient-card">
    <div v-for="item in modeList" :key="item.type">
      <div class="item">
        <GiSvgIcon :name="item.icon" :size="38" />
        <div class="info">
          <div class="info-top">
            <span class="label">{{ item.title }}</span>
            <span class="bind">
              <icon-check-circle-fill v-if="item.status" :size="14" class="success" />
              <icon-exclamation-circle-fill v-else :size="14" class="warning" />
              <span style="font-size: 12px" :class="item.status ? 'success' : 'warning'">{{
                item.status ? '已绑定' : '未绑定'
              }}</span>
            </span>
          </div>
          <div class="info-desc">
            <span class="value">{{ item.value }}</span>
            {{ item.subtitle }}
          </div>
        </div>
        <div class="btn-wrapper">
          <a-button
            v-if="item.jumpMode === 'modal'"
            class="btn"
            :type="item.status ? 'secondary' : 'primary'"
            @click="onUpdate(item.type, item.status)"
          >
            {{ item.status ? '修改' : '绑定' }}
          </a-button>
          <a-button
            v-else-if="item.jumpMode === 'link'"
            class="btn"
            :type="item.status ? 'secondary' : 'primary'"
            @click="onBinding(item.type, item.status)"
          >
            {{ item.status ? '解绑' : '绑定' }}
          </a-button>
        </div>
      </div>
    </div>
  </a-card>
  <VerifyModel ref="verifyModelRef" />
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import type { ModeItem } from '../type'
import VerifyModel from '../components/VerifyModel.vue'
import { listSocialPlatform, listUserSocial, socialAuth, unbindSocialAccount } from '@/apis'
import { getSocialIcon } from '@/constant/social'

const modeList = ref<ModeItem[]>([])

// 初始化数据
const initData = async () => {
  const [{ data: boundList }, { data: platformList }] = await Promise.all([listUserSocial(), listSocialPlatform()])
  const boundSourceSet = new Set((boundList ?? []).map((item) => item.source?.toUpperCase()))
  modeList.value = (platformList ?? []).map((item) => {
    const bound = boundSourceSet.has(item.source?.toUpperCase())
    return {
      title: `绑定 ${item.name}`,
      icon: getSocialIcon(item.source),
      subtitle: `${bound ? '' : '绑定后，'}可通过 ${item.name} 进行登录`,
      jumpMode: 'link',
      type: item.source,
      status: bound,
    }
  })
}

// 绑定
const onBinding = (type: string, status: boolean) => {
  if (!status) {
    socialAuth(type).then((res) => {
      window.open(res.data.authorizeUrl, '_self')
    })
  } else {
    unbindSocialAccount(type).then(() => {
      initData()
      Message.success('解绑成功')
    })
  }
}

const verifyModelRef = ref<InstanceType<typeof VerifyModel>>()
// 修改
const onUpdate = (type: string) => {
  verifyModelRef.value?.open(type)
}

onMounted(() => {
  initData()
})
</script>

<style scoped lang="scss"></style>
