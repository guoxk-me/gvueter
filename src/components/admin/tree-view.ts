export interface TreeNode<TValue extends string = string> {
  id: TValue
  label: string
  disabled?: boolean
  /** Declares an expandable branch whose children can be loaded on demand. */
  hasChildren?: boolean
  children?: readonly TreeNode<TValue>[]
}

export interface VisibleTreeNode<TValue extends string = string> {
  node: TreeNode<TValue>
  depth: number
  hasChildren: boolean
}
