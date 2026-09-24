export interface ModeItem {
  title: string
  icon: string
  subtitle: string
  value?: string
  type: string
  jumpMode?: 'link' | 'modal'
  status: boolean
  statusString?: string
}
