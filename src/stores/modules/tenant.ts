import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { TenantAvailableResp } from '@/apis/tenant/type'

export const useTenantStore = defineStore('tenant', () => {
  const tenantEnabled = ref<boolean>(false)
  const tenantId = ref<string>()
  // 上次选择的租户 ID（域名无法识别租户时记住用户的选择）
  const selectedTenantId = ref<string>()
  // 可用租户列表（域名无法识别租户时，供登录页下拉选择）
  const availableTenants = ref<TenantAvailableResp[]>([])

  const setTenantEnable = (status: boolean) => {
    tenantEnabled.value = status
  }
  const setTenantId = (id: string) => {
    tenantId.value = id
  }
  const setSelectedTenantId = (id?: string) => {
    selectedTenantId.value = id
  }
  const setAvailableTenants = (list: TenantAvailableResp[]) => {
    availableTenants.value = list
  }

  // 判断是否需要用户手动选择租户（已开启租户且候选租户列表非空）
  const needSelectTenant = computed(() => {
    return tenantEnabled.value && availableTenants.value.length > 0
  })

  // 判断租户是否已正确配置
  const isTenantConfigured = computed(() => {
    return tenantEnabled.value && !!tenantId.value
  })

  // 清空租户ID
  const resetTenantId = () => {
    tenantId.value = undefined
  }
  return {
    tenantEnabled,
    tenantId,
    selectedTenantId,
    availableTenants,
    setTenantEnable,
    setTenantId,
    setSelectedTenantId,
    setAvailableTenants,
    needSelectTenant,
    isTenantConfigured,
    resetTenantId,
  }
}, {
  persist: { paths: ['tenantEnabled', 'tenantId', 'selectedTenantId'], storage: localStorage },
})
