import classNames from "classnames";
import { useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import type { ComponentType, ReactElement, Ref, RefAttributes } from "react";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { HotKeyOptions, HotkeyAction } from "../../../hooks/useHotKey";
import { jotaiStore } from "../../../lib/jotai";
import type { ContextMenuProps } from "../Dropdown";
import { Icon } from "../Icon";
import {
  collapsedFamily,
  focusIdsFamily,
  isCollapsedFamily,
  isLastFocusedFamily,
  isSelectedFamily,
  selectedIdsFamily,
} from "./atoms";
import type { TreeNode } from "./common";
import { closestVisibleNode, equalSubtree } from "./common";
import { TreeIndentGuide } from "./TreeIndentGuide";
import { useSelectableItems } from "./useSelectableItems";

export interface TreeProps<T extends { id: string }> {
  root: TreeNode<T>;
  treeId: string;
  getItemKey: (item: T) => string;
  getContextMenu?: (items: T[]) => ContextMenuProps["items"] | Promise<ContextMenuProps["items"]>;
  ItemInner: ComponentType<{ treeId: string; item: T }>;
  ItemLeftSlotInner?: ComponentType<{ treeId: string; item: T }>;
  ItemRightSlot?: ComponentType<{ treeId: string; item: T }>;
  className?: string;
  onActivate?: (item: T) => void;
  onDragEnd?: (opt: { items: T[]; parent: T; children: T[]; insertAt: number }) => void;
  hotkeys?: {
    actions: Partial<Record<HotkeyAction, { cb: (items: T[]) => void } & HotKeyOptions>>;
  };
  getEditOptions?: (item: T) => {
    defaultValue: string;
    placeholder?: string;
    onChange: (item: T, text: string) => void;
  };
}

export interface TreeHandle {
  treeId: string;
  focus: () => boolean;
  hasFocus: () => boolean;
  selectItem: (id: string, focus?: boolean) => void;
  renameItem: (id: string) => void;
  showContextMenu: () => void;
}

type TreeComponent = <T extends { id: string }>(
  props: TreeProps<T> & RefAttributes<TreeHandle>,
) => ReactElement | null;

let dndTreeComponent: TreeComponent | null = null;
let dndTreePromise: Promise<TreeComponent> | null = null;
const dndTreeListeners = new Set<() => void>();

function requestIdle(callback: () => void) {
  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: 500 });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = setTimeout(callback, 16);
  return () => clearTimeout(timeoutId);
}

function loadDndTree() {
  dndTreePromise ??= import("./TreeDnd").then((module) => {
    dndTreeComponent = module.DndTree as TreeComponent;
    for (const listener of dndTreeListeners) {
      listener();
    }
    return dndTreeComponent;
  });

  return dndTreePromise;
}

function useDndTreeComponent() {
  const [component, setComponent] = useState<TreeComponent | null>(() => dndTreeComponent);

  useEffect(() => {
    if (component != null) return;

    const listener = () => setComponent(() => dndTreeComponent);
    dndTreeListeners.add(listener);
    const cancelIdle = requestIdle(() => {
      loadDndTree().catch(console.error);
    });

    return () => {
      cancelIdle();
      dndTreeListeners.delete(listener);
    };
  }, [component]);

  return component;
}

function TreeInner<T extends { id: string }>(props: TreeProps<T>, ref: Ref<TreeHandle>) {
  const DndTree = useDndTreeComponent();

  if (DndTree != null) {
    return <DndTree {...props} ref={ref} />;
  }

  return <StaticTree {...props} ref={ref} />;
}

function StaticTreeInner<T extends { id: string }>(
  { className, getItemKey, ItemInner, ItemLeftSlotInner, ItemRightSlot, onActivate, root, treeId }: TreeProps<T>,
  ref: Ref<TreeHandle>,
) {
  const treeRef = useRef<HTMLDivElement>(null);
  const selectableItems = useSelectableItems(root);

  const tryFocus = useCallback(() => {
    const $el = treeRef.current?.querySelector<HTMLButtonElement>(
      '.tree-item button[tabindex="0"]',
    );
    if ($el == null) return false;
    $el.focus();
    $el.scrollIntoView({ block: "nearest" });
    return true;
  }, []);

  const setSelected = useCallback(
    (id: string, focus?: boolean) => {
      jotaiStore.set(selectedIdsFamily(treeId), [id]);
      jotaiStore.set(focusIdsFamily(treeId), { anchorId: id, lastId: id });
      if (focus) {
        setTimeout(tryFocus, 50);
      }
    },
    [treeId, tryFocus],
  );

  useEffect(() => {
    const ids = jotaiStore.get(selectedIdsFamily(treeId));
    const fallback = selectableItems[0];
    if (ids.length === 0 && fallback != null) {
      setSelected(fallback.node.item.id);
    }
  }, [selectableItems, setSelected, treeId]);

  const ensureTabbableItem = useCallback(() => {
    const lastSelectedId = jotaiStore.get(focusIdsFamily(treeId)).lastId;
    const lastSelectedItem = selectableItems.find(
      (item) => item.node.item.id === lastSelectedId && !item.node.hidden,
    );

    if (lastSelectedItem == null) {
      const firstItem = selectableItems.find((item) => !item.node.hidden);
      if (firstItem != null) {
        setSelected(firstItem.node.item.id);
      }
      return;
    }

    const closest = closestVisibleNode(treeId, lastSelectedItem.node);
    if (closest != null) {
      setSelected(closest.item.id);
    }
  }, [selectableItems, setSelected, treeId]);

  useEffect(() => {
    const unsub = jotaiStore.sub(collapsedFamily(treeId), ensureTabbableItem);
    return unsub;
  }, [ensureTabbableItem, treeId]);

  useEffect(() => {
    requestAnimationFrame(ensureTabbableItem);
  });

  const handle = useMemo<TreeHandle>(
    () => ({
      treeId,
      focus: tryFocus,
      hasFocus: () => treeRef.current?.contains(document.activeElement) ?? false,
      renameItem: () => {},
      selectItem: (id, focus) => {
        if (jotaiStore.get(selectedIdsFamily(treeId)).includes(id)) return;
        setSelected(id, focus);
      },
      showContextMenu: () => {},
    }),
    [setSelected, treeId, tryFocus],
  );

  useImperativeHandle(ref, () => handle, [handle]);

  return (
    <div
      ref={treeRef}
      className={classNames(
        className,
        "outline-none h-full",
        "overflow-y-auto overflow-x-hidden",
        "grid grid-rows-[auto_1fr]",
        "[&_.tree-item.selected_.tree-item-inner]:text-text",
        "[&:focus-within]:[&_.tree-item.selected]:bg-surface-active",
        "[&:not(:focus-within)]:[&_.tree-item.selected]:bg-surface-highlight",
        "[&_.tree-item]:rounded-md",
        "[&_.tree-item.selected+.tree-item.selected]:rounded-t-none",
        "[&_.tree-item.selected:has(+.tree-item.selected)]:rounded-b-none",
      )}
    >
      <ul>
        {selectableItems.map(({ node, depth }) => (
          <StaticTreeItem
            key={getItemKey(node.item)}
            treeId={treeId}
            node={node}
            depth={depth}
            ItemInner={ItemInner}
            ItemLeftSlotInner={ItemLeftSlotInner}
            ItemRightSlot={ItemRightSlot}
            onActivate={onActivate}
            onSelect={setSelected}
          />
        ))}
      </ul>
    </div>
  );
}

function StaticTreeItem<T extends { id: string }>({
  treeId,
  node,
  depth,
  ItemInner,
  ItemLeftSlotInner,
  ItemRightSlot,
  onActivate,
  onSelect,
}: Pick<TreeProps<T>, "ItemInner" | "ItemLeftSlotInner" | "ItemRightSlot" | "onActivate"> & {
  treeId: string;
  node: TreeNode<T>;
  depth: number;
  onSelect: (id: string, focus?: boolean) => void;
}) {
  const isSelected = useAtomValue(isSelectedFamily({ treeId, itemId: node.item.id }));
  const isCollapsed = useAtomValue(isCollapsedFamily({ treeId, itemId: node.item.id }));
  const isLastSelected = useAtomValue(isLastFocusedFamily({ treeId, itemId: node.item.id }));
  const ancestorIds = useMemo(() => {
    const ids: string[] = [];
    let parent = node.parent;

    while (parent) {
      ids.push(parent.item.id);
      parent = parent.parent;
    }

    return ids;
  }, [node]);
  const isAncestorCollapsedAtom = useMemo(
    () =>
      selectAtom(
        collapsedFamily(treeId),
        (collapsed) => ancestorIds.some((id) => collapsed[id]),
        Object.is,
      ),
    [ancestorIds, treeId],
  );
  const isAncestorCollapsed = useAtomValue(isAncestorCollapsedAtom);

  const toggleCollapsed = useCallback(() => {
    jotaiStore.set(isCollapsedFamily({ treeId, itemId: node.item.id }), (prev) => !prev);
  }, [node.item.id, treeId]);

  const handleClick = useCallback(() => {
    onSelect(node.item.id, true);
    onActivate?.(node.item);
  }, [node.item, onActivate, onSelect]);

  if (node.hidden || isAncestorCollapsed) return null;

  return (
    <li
      className={classNames(
        "tree-item",
        "h-sm",
        "grid grid-cols-[auto_minmax(0,1fr)]",
        isSelected && "selected",
      )}
    >
      <TreeIndentGuide treeId={treeId} depth={depth} ancestorIds={ancestorIds} />
      <div className="text-text-subtle grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2 items-center rounded-md">
        {node.children != null ? (
          <button
            type="button"
            tabIndex={-1}
            className="h-full pl-[0.5rem] outline-none"
            onClick={toggleCollapsed}
          >
            <Icon
              icon={node.children.length === 0 ? "dot" : "chevron_right"}
              className={classNames(
                "transition-transform text-text-subtlest",
                "ml-auto",
                "w-[1rem] h-[1rem]",
                !isCollapsed && node.children.length > 0 && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span aria-hidden />
        )}

        <button
          type="button"
          onClick={handleClick}
          className="cursor-default tree-item-inner pr-1 focus:outline-none flex items-center gap-2 h-full whitespace-nowrap"
          tabIndex={isLastSelected ? 0 : -1}
        >
          {ItemLeftSlotInner != null && <ItemLeftSlotInner treeId={treeId} item={node.item} />}
          <ItemInner treeId={treeId} item={node.item} />
        </button>
        {ItemRightSlot != null ? (
          <ItemRightSlot treeId={treeId} item={node.item} />
        ) : (
          <span aria-hidden />
        )}
      </div>
    </li>
  );
}

const StaticTree = forwardRef(StaticTreeInner) as <T extends { id: string }>(
  props: TreeProps<T> & RefAttributes<TreeHandle>,
) => ReactElement | null;

const Tree_ = forwardRef(TreeInner) as <T extends { id: string }>(
  props: TreeProps<T> & RefAttributes<TreeHandle>,
) => ReactElement | null;

export const Tree = memo(
  Tree_,
  ({ root: prevNode, ...prevProps }, { root: nextNode, ...nextProps }) => {
    for (const key of Object.keys(prevProps)) {
      if (prevProps[key as keyof typeof prevProps] !== nextProps[key as keyof typeof nextProps]) {
        return false;
      }
    }
    return equalSubtree(prevNode, nextNode, nextProps.getItemKey);
  },
) as typeof Tree_;
