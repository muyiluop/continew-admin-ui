import type * as T from './type'
import http from '@/utils/http'

export type * from './type'

const BASE_URL = '/system/module'

/** @desc 查询模块列表 */
export function listModule(query?: T.ModuleQuery) {
  return http.get<T.ModuleResp[]>(`${BASE_URL}/list`, query)
}

/** @desc 分页查询模块 */
export function pageModule(query?: T.ModulePageQuery) {
  return http.get<PageRes<T.ModuleResp[]>>(`${BASE_URL}`, query)
}

/** @desc 查询模块字典列表（无需模块管理权限，供按模块选择的页面使用） */
export function listModuleDict() {
  return http.get<T.ModuleResp[]>(`${BASE_URL}/dict`)
}

/** @desc 查询模块详情 */
export function getModule(id: string) {
  return http.get<T.ModuleResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增模块 */
export function addModule(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改模块 */
export function updateModule(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除模块 */
export function deleteModule(id: string) {
  return http.del(`${BASE_URL}`, { ids: [id] })
}
