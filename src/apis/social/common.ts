import type { SocialPlatformResp } from './type'
import http from '@/utils/http'

const BASE_URL = '/social/common'

/** @desc 查询当前租户已启用的社交登录平台列表 */
export function listSocialPlatform() {
  return http.get<SocialPlatformResp[]>(`${BASE_URL}/platforms`)
}
