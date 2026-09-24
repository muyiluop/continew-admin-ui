import type { TenantCommonResp } from './type'
import http from '@/utils/http'

const BASE_URL = '/tenant/common'

/** @desc 根据域名查询租户 ID */
export function getTenantIdByDomain(domain: string) {
  return http.get<string>(`${BASE_URL}/id`, { domain })
}

/** @desc 查询租户信息（开启状态 + 可用租户列表） */
export function getTenantInfo() {
  return http.get<TenantCommonResp>(`${BASE_URL}/info`)
}
