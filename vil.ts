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
  container: HTMLElement;
  listId: string;
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

    const newContainer = newDoc.querySelector(`[data-vil-container="${listId}"]`);
    if (newContainer === null) {
      return;
    }

    const newRoot = newContainer.parentElement;
    if (newRoot === null) {
      console.warn("No parent found for new container");
      return;
    }

    const newTriggers = newRoot.querySelectorAll(`[data-vil-trigger="${listId}"]`);

    for (const trigger of Array.from(triggers)) {
      trigger.removeAttribute("data-vil-trigger");
    }

    triggerChildLoad(listId, hooks, newDoc);

    const newChildren = Array.from(newContainer.children);

    const htmlElChildren = newChildren.filter((child) => child instanceof HTMLElement);

    if (htmlElChildren.length !== newChildren.length) {
      console.error(newChildren);
      throw new Error("Non-HTMLElement children found");
    }

    appendChildren(context, htmlElChildren);

    const newNext = newDoc.querySelector<HTMLAnchorElement>(`a[data-vil-next="${listId}"]`);
    if (newNext === null) {
      next.remove();
      return;
    }
    next.replaceWith(newNext);

    infiniteScroll(listId, hooks, context, newNext, newTriggers);
  });

  for (const trigger of Array.from(triggers)) {
    observer.observe(trigger);
  }
}

function initContainer(container: Element, cache: Cache | null): InitResult {
  if (!(container instanceof HTMLElement)) {
    throw new Error("Container is not an HTMLElement");
  }

  const listId = container.dataset["vilContainer"];
  if (listId === undefined) {
    throw new Error("List ID not found");
  }

  const triggers = container.querySelectorAll(`[data-vil-trigger="${listId}"]`);
  const next = document.body.querySelector<HTMLAnchorElement>(`a[data-vil-next="${listId}"]`);

  triggerChildLoad(listId, hooks);

  const listCache = cache?.[listId];

  const vList = vListInit({
    container,
    cache: listCache?.virtuaSnapshot,
    scrollOffset: listCache?.scrollOffset,
  });

  if (next !== null) {
    requestIdleCallback(() => {
      infiniteScroll(listId, hooks, vList.context, next, triggers);
    });
  }

  return { vList, container, listId };
}

let lists: InitResult[];
let hooks: VilHooks[];

async function pageLoad(): Promise<void> {
  const containers = document.body.querySelectorAll("[data-vil-container]");

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

  const cacheMeta = document.querySelector<HTMLMetaElement>('meta[name="vil-cache"]');
  cacheMeta?.remove();
  const cache = JSON.parse(cacheMeta?.content ?? "null");

  lists = Array.from(containers).map((container) => initContainer(container, cache));
}

function pageUnload(): void {
  const cache: Cache = {};
  for (const { vList, container, listId } of lists) {
    const virtuaSnapshot = vList.context.store.$getCacheSnapshot();
    const scrollOffset = vList.context.store.$getScrollOffset();

    for (const child of vList.context.state.children) {
      container.appendChild(child);
    }

    vList.dispose();

    cache[listId] = { virtuaSnapshot, scrollOffset };
  }

  for (const hook of hooks) {
    if ("childUnload" in hook && typeof hook["childUnload"] === "function") {
      hook["childUnload"]();
    }
  }

  const cacheMeta = document.createElement("meta");
  cacheMeta.name = "vil-cache";
  cacheMeta.content = JSON.stringify(cache);
  document.head.appendChild(cacheMeta);
}

export const freezeHooks = {
  pageLoad,
  pageUnload,
};
