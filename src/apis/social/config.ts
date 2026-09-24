import type * as T from './type'
import http from '@/utils/http'
import type { LabelValueState } from '@/types/global'

const BASE_URL = '/social/config'

/** @desc 查询社交登录平台配置列表 */
export function listSocialConfig(query: T.SocialConfigPageQuery) {
  return http.get<PageRes<T.SocialConfigResp[]>>(`${BASE_URL}`, query)
}

/** @desc 查询社交登录平台配置详情 */
export function getSocialConfig(id: string) {
  return http.get<T.SocialConfigDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增社交登录平台配置 */
export function addSocialConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改社交登录平台配置 */
export function updateSocialConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除社交登录平台配置 */
export function deleteSocialConfig(id: string) {
  return http.del(`${BASE_URL}`, { ids: [id] })
}

/** @desc 修改平台配置状态 */
export function updateSocialConfigStatus(data: { status: number }, id: string) {
  return http.put(`${BASE_URL}/${id}/status`, data)
}

/** @desc 查询支持的平台列表 */
export function listSocialSource() {
  return http.get<LabelValueState[]>(`${BASE_URL}/source/list`)
}
