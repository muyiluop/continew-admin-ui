/** 社交登录平台配置 */
export interface SocialConfigResp {
  id: string
  source: string
  name: string
  clientId: string
  agentId: string
  redirectUri: string
  sort: number
  description: string
  status: number
  createUser: string
  createTime: string
  updateUser: string
  updateTime: string
  createUserString: string
  updateUserString: string
}

/** 社交登录平台配置详情 */
export interface SocialConfigDetailResp extends SocialConfigResp {
  scopes: string
  unionId: boolean
  ignoreCheckState: boolean
  extConfig: string
  clientSecretConfigured: boolean
}

/** 社交登录平台配置查询条件 */
export interface SocialConfigQuery {
  description?: string
  source?: string
  status?: number
  sort: Array<string>
}

export interface SocialConfigPageQuery extends SocialConfigQuery, PageQuery {}

/** 社交登录平台（登录页、个人中心渲染用） */
export interface SocialPlatformResp {
  source: string
  name: string
}
