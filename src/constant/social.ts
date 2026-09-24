/**
 * 社交登录平台图标映射
 *
 * <p>未收录的平台使用通用图标。</p>
 */
const socialIconMap: Record<string, string> = {
  GITEE: 'gitee',
  GITCODE: 'gitcode',
  GITHUB: 'github',
  WECHAT_OPEN: 'wechat',
}

/** 获取社交登录平台图标 */
export function getSocialIcon(source: string) {
  return socialIconMap[source?.toUpperCase()] ?? 'link'
}
