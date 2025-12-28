'use client';

import { useState, type CSSProperties, type FC, type MouseEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import { AddButton, DeleteButton, EditButton } from '@/components/admin/common/ActionButtons';
import type { CategoryTree } from '@/types/api-schema';
import styles from './CategoryTree.module.scss';

interface CategoryTreeNodeProps {
  node: CategoryTree;
  level: number;
  onEdit: (category: CategoryTree) => void;
  onDelete: (category: CategoryTree) => void;
  onAddSubcategory: (parent: CategoryTree) => void;
  forceExpand?: boolean;
}

export const CategoryTreeNode: FC<CategoryTreeNodeProps> = ({
  node,
  level,
  onEdit,
  onDelete,
  onAddSubcategory,
  forceExpand = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(level === 0 || forceExpand); // Expand root level by default
  const hasChildren = node.children && node.children.length > 0;

  // Update expansion state when forceExpand changes
  if (forceExpand && !isExpanded) {
    setIsExpanded(true);
  }

  const handleExpandClick = (e: MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleEditClick = (e: MouseEvent) => {
    e.stopPropagation();
    onEdit(node);
  };

  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    onDelete(node);
  };

  const handleAddSubcategoryClick = (e: MouseEvent) => {
    e.stopPropagation();
    onAddSubcategory(node);
  };

  return (
    <div className={styles.nodeContainer}>
      <div className={styles.nodeContent} style={{ '--indent-level': level } as CSSProperties}>
        <div
          className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''} ${!hasChildren ? styles.placeholder : ''}`}
          onClick={hasChildren ? handleExpandClick : undefined}
        >
          {hasChildren && <ChevronRight size={16} />}
        </div>

        <div className={styles.nodeInfo}>
          <span className={styles.nodeName}>{node.name}</span>
          <span className={styles.nodeSlug}>/{node.slug}</span>
          {node.type && <span className={styles.nodeType}>{node.type}</span>}
        </div>

        <div className={styles.actions}>
          <AddButton onClick={handleAddSubcategoryClick} title="Add subcategory" />
          <EditButton onClick={handleEditClick} title="Edit category" />
          <DeleteButton onClick={handleDeleteClick} title="Delete category" />
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className={styles.childrenContainer}>
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSubcategory={onAddSubcategory}
              forceExpand={forceExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};
