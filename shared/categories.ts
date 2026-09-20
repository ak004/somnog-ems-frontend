export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  isPublic: boolean;
  order: number;
  eventCount?: number;
  children?: CategoryNode[];
};

export function flattenCategories(
  nodes: CategoryNode[],
  prefix = "",
): { value: string; label: string }[] {
  return nodes.flatMap((node) => {
    const label = prefix ? `${prefix} / ${node.name}` : node.name;
    return [
      { value: node.id, label },
      ...flattenCategories(node.children ?? [], label),
    ];
  });
}

export function flattenCategoryRows(
  nodes: CategoryNode[],
  depth = 0,
): Array<CategoryNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenCategoryRows(node.children ?? [], depth + 1),
  ]);
}
