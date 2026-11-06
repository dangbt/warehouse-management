import type { ReactNode } from 'react'

export interface TreeNode {
  id: string
  label: string
  icon?: ReactNode
  children?: TreeNode[]
  route?: string
  permission?: string
}
