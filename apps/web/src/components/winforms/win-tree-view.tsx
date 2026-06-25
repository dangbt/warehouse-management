import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import type { TreeNode } from '@/types'

interface Props {
  nodes: TreeNode[]
  activeId?: string
  onSelect: (node: TreeNode) => void
}

export function WinTreeView({ nodes, activeId, onSelect }: Props) {
  return (
    <div className="text-xs py-1 select-none">
      {nodes.map((node) => (
        <TreeItem key={node.id} node={node} depth={0} activeId={activeId} onSelect={onSelect} />
      ))}
    </div>
  )
}

function TreeItem({ node, depth, activeId, onSelect }: { node: TreeNode; depth: number; activeId?: string; onSelect: (n: TreeNode) => void }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  return (
    <>
      <div
        data-testid={`sidebar-${node.id}`}
        className={`flex items-center gap-1 py-1 cursor-pointer hover:bg-win-menu-hover ${activeId === node.id ? 'bg-win-grid-selected font-semibold' : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded)
          if (node.route) onSelect(node)
        }}
      >
        {hasChildren ? (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : <span className="w-3" />}
        {node.icon && <span>{node.icon}</span>}
        <span>{node.label}</span>
      </div>
      {hasChildren && expanded && node.children!.map((child) => (
        <TreeItem key={child.id} node={child} depth={depth + 1} activeId={activeId} onSelect={onSelect} />
      ))}
    </>
  )
}
