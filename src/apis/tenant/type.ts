/** 租户 */
export interface TenantResp {
  id: string
  name: string
  code: string
  domain: string
  expireTime: string
  description: number
  status: string
  packageId: string
  createUser: string
  createTime: string
  updateUser: string
  updateTime: string
  createUserString: string
  updateUserString: string
  adminUsername: string
  packageName: string
}
export interface TenantQuery {
  description?: string
  packageId?: string
  status?: string
  sort: Array<string>
}
export interface TenantPageQuery extends TenantQuery, PageQuery {}

/** 可用租户（登录时选择租户使用） */
export interface TenantAvailableResp {
  id: string
  name: string
}

/** 租户通用信息 */
export interface TenantCommonResp {
  isEnabled: boolean
  availableList: TenantAvailableResp[]
}

/** 租户套餐 */
export interface TenantPackageResp {
  id: string
  name: string
  sort: number
  menuCheckStrictly: string
  description: string
  status: string
  menuIds: []
  createUser: string
  createTime: string
  updateUser: string
  updateTime: string
  createUserString: string
  updateUserString: string
}
export interface TenantPackageQuery {
  description?: string
  status?: string
  sort: Array<string>
}
export interface TenantPackagePageQuery extends TenantPackageQuery, PageQuery {}
