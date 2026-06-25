export interface TreeNode {
  id: string
  label: string
  icon?: string
  children?: TreeNode[]
  route?: string
  permission?: string
}
