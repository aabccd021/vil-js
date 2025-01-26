import {
  type CacheSnapshot,
  type Context,
  type InitResult as VirtuaInitResult,
  appendChildren,
  init as vListInit,
} from "vanilla-virtua";

type ListCache = {
  virtuaSnapshot: CacheSnapshot;
  scrollOffset: number;
};

type Cache = Record<string, ListCache>;

type InitResult = {
  vList: VirtuaInitResult;
  root: HTMLElement;
  listId: string;
};

type FreezeInitEvent = {
  cache?: Cache;
};

type VilHooks = Record<string, (...args: unknown[]) => unknown>;

function triggerChildLoad(listId: string, hooks: VilHooks[], document?: Document): void {
  for (const hook of Object.values(hooks)) {
    if ("childLoad" in hook && typeof hook["childLoad"] === "function") {
      hook["childLoad"]({ listId, document });
    }
  }
}

function infiniteScroll(
  listId: string,
  hooks: VilHooks[],
  context: Context,
  next: HTMLAnchorElement,
  triggers: NodeListOf<Element>,
): void {
  if (triggers.length === 0) {
    return;
  }

  const observer = new IntersectionObserver(async (entries) => {
    if (entries.every((entry) => !entry.isIntersecting)) {
      return;
    }

    observer.disconnect();

    const response = await fetch(next.href, { redirect: "follow" });
    const html = await response.text();
    const newDoc = new DOMParser().parseFromString(html, "text/html");

    const newRoot = newDoc.querySelector(`[data-infinite-root="${listId}"]`);
    if (newRoot === null) {
      return;
    }

    for (const trigger of Array.from(triggers)) {
      trigger.removeAttribute("data-infinite-trigger");
    }

    triggerChildLoad(listId, hooks, newDoc);

    const newChildren = Array.from(newRoot.children);
    appendChildren(context, newChildren);

    const newNext = newDoc.querySelector<HTMLAnchorElement>(`a[data-infinite-next="${listId}"]`);
    if (newNext === null) {
      next.remove();
      return;
    }
    next.replaceWith(newNext);

    const newTriggers = newRoot.querySelectorAll(`[data-infinite-trigger="${listId}"]`);
    infiniteScroll(listId, hooks, context, newNext, newTriggers);
  });

  for (const trigger of Array.from(triggers)) {
    observer.observe(trigger);
  }
}

function initRoot(root: Element, cache: Cache | undefined): InitResult {
  if (!(root instanceof HTMLElement)) {
    throw new Error("Root is not an HTMLElement");
  }

  const listId = root.dataset["infiniteRoot"];
  if (listId === undefined) {
    throw new Error("List ID not found");
  }

  const triggers = root.querySelectorAll(`[data-infinite-trigger="${listId}"]`);
  const next = document.body.querySelector<HTMLAnchorElement>(`a[data-infinite-next="${listId}"]`);

  triggerChildLoad(listId, hooks);

  const listCache = cache?.[listId];

  const vList = vListInit({
    children: Array.from(root.children),
    cache: listCache?.virtuaSnapshot,
  });

  root.appendChild(vList.root);

  if (listCache?.scrollOffset) {
    vList.context.scroller.$scrollTo(listCache.scrollOffset);
  }

  if (next !== null) {
    infiniteScroll(listId, hooks, vList.context, next, triggers);
  }

  return { vList, root, listId };
}

let lists: InitResult[];
let hooks: VilHooks[];

async function pageLoad({ cache }: FreezeInitEvent): Promise<void> {
  const roots = document.body.querySelectorAll("[data-infinite-root]");

  const moduleLoadPromises = Array.from(document.querySelectorAll("script"))
    .filter((script) => script.type === "module")
    .map((script) => import(script.src));

  const moduleLoadResults = await Promise.allSettled(moduleLoadPromises);

  for (const moduleLoadResult of moduleLoadResults) {
    if (moduleLoadResult.status === "rejected") {
      console.error(moduleLoadResult.reason);
    }
  }

  const modules = moduleLoadResults
    .filter((moduleLoadResult) => moduleLoadResult.status === "fulfilled")
    .map((moduleLoadResult) => moduleLoadResult.value);

  hooks = [];
  for (const module of modules) {
    if ("vilHooks" in module && typeof module.vilHooks === "object" && module.vilHooks !== null) {
      hooks.push(module.vilHooks);
    }
  }

  lists = Array.from(roots).map((root) => initRoot(root, cache));
}

function pageUnload(): Cache {
  const cache: Cache = {};
  for (const { vList, root, listId } of lists) {
    const virtuaSnapshot = vList.context.store.$getCacheSnapshot();
    const scrollOffset = vList.context.store.$getScrollOffset();

    for (const child of vList.context.state.children) {
      root.appendChild(child);
    }

    vList.root.remove();

    cache[listId] = { virtuaSnapshot, scrollOffset };
  }

  for (const hook of hooks) {
    if ("childUnload" in hook && typeof hook["childUnload"] === "function") {
      hook["childUnload"]();
    }
  }

  return cache;
}

export const freezeHooks = {
  pageLoad,
  pageUnload,
};
