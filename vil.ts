import {
  type CacheSnapshot,
  type Virtualizer,
  appendItems,
  dispose,
  getCacheSnapshot,
  getScrollOffset,
  init as initVirtualizer,
  scrollTo,
} from "vanilla-virtua/virtualizer.ts";

type ListCache = {
  cacheSnapshot: CacheSnapshot;
  scrollOffset: number;
};

type Cache = Record<string, ListCache>;

type InitResult = {
  virt: Virtualizer;
  container: HTMLElement;
  listId: string;
};

type Hooks = [string, (...args: unknown[]) => unknown];

function invokeHooks(hooks: Hooks[], name: string, args: unknown): void {
  for (const [hookName, fn] of hooks) {
    if (hookName !== name) {
      continue;
    }
    try {
      fn(args);
    } catch (e) {
      console.error(`Error in ${name} hook:`, e);
    }
  }
}

async function infiniteScroll(args: {
  listId: string;
  hooks: Hooks[];
  virt: Virtualizer;
  next: HTMLAnchorElement;
  triggers: NodeListOf<Element>;
}): Promise<void> {
  const { listId, hooks, virt: virtualizer } = args;
  let { triggers, next } = args;

  while (true) {
    if (triggers.length === 0) {
      return;
    }

    const resolver = Promise.withResolvers();

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

      const newTriggers = newContainer.querySelectorAll(`[data-vil-trigger="${listId}"]`);
      for (const trigger of Array.from(triggers)) {
        trigger.removeAttribute("data-vil-trigger");
      }
      triggers = newTriggers;

      invokeHooks(hooks, "VilItemsAppend", { listId, document: newDoc });

      const newChildren = Array.from(newContainer.children);

      const htmlElChildren = newChildren.filter((child) => child instanceof HTMLElement);

      if (htmlElChildren.length !== newChildren.length) {
        console.error(newChildren);
        throw new Error("Non-HTMLElement children found");
      }

      appendItems(virtualizer, htmlElChildren);

      const newNext = newDoc.querySelector<HTMLAnchorElement>(`a[data-vil-next="${listId}"]`);
      if (newNext === null) {
        next.remove();
        return;
      }
      next.replaceWith(newNext);
      next = newNext;
      resolver.resolve(undefined);
    });

    for (const trigger of Array.from(triggers)) {
      observer.observe(trigger);
    }

    await resolver.promise;
  }
}

let lists: InitResult[];
let hooks: Hooks[] = [];

export async function load(): Promise<void> {
  const containers = document.body.querySelectorAll("[data-vil-container]");

  const hookLoadPromises = Array.from(document.querySelectorAll("script"))
    .filter((script) => script.type === "module")
    .flatMap(async (script) => {
      const module = await import(script.src);
      if (!("hooks" in module && Array.isArray(module.hooks))) {
        return [];
      }
      return module.hooks as Hooks[];
    });

  const hookLoadResultsNested = await Promise.allSettled(hookLoadPromises);

  for (const hookLoadResult of hookLoadResultsNested) {
    if (hookLoadResult.status === "rejected") {
      console.error(hookLoadResult.reason);
    }
  }

  hooks = hookLoadResultsNested
    .filter((hookLoadResults) => hookLoadResults.status === "fulfilled")
    .flatMap((hookLoadResults) => hookLoadResults.value);

  const cacheMeta = document.querySelector<HTMLMetaElement>('meta[name="vil-cache"]');
  cacheMeta?.remove();
  const cache = JSON.parse(cacheMeta?.content ?? "null");

  lists = [];

  for (const container of Array.from(containers)) {
    if (!(container instanceof HTMLElement)) {
      console.error("Container is not an HTMLElement");
      continue;
    }

    const root = container.parentElement;
    if (root === null) {
      console.error("Root not found");
      continue;
    }

    const listId = container.dataset["vilContainer"];
    if (listId === undefined) {
      console.error("List ID not found");
      continue;
    }

    const triggers = container.querySelectorAll(`[data-vil-trigger="${listId}"]`);
    const next = document.body.querySelector<HTMLAnchorElement>(`a[data-vil-next="${listId}"]`);

    invokeHooks(hooks, "VilItemsAppend", { listId });

    const listCache = cache?.[listId];

    const virt = initVirtualizer({
      container,
      cache: listCache?.cacheSnapshot,
      totalSizeStyle: "height",
      offsetStyle: "top",
      root,
    });

    scrollTo(virt, listCache?.scrollOffset);

    if (next !== null) {
      infiniteScroll({
        listId,
        hooks,
        virt,
        next,
        triggers,
      });
    }

    lists.push({ virt, container, listId });
  }
}

export function unload(): void {
  const cache: Cache = {};
  for (const { virt, container, listId } of lists) {
    const cacheSnapshot = getCacheSnapshot(virt);
    const scrollOffset = getScrollOffset(virt);

    dispose(virt);

    for (const item of virt.items) {
      item.style.visibility = "visible";
      container.appendChild(item);
    }

    cache[listId] = { cacheSnapshot, scrollOffset };
  }

  invokeHooks(hooks, "VilListUnload", {});

  const cacheMeta = document.createElement("meta");
  cacheMeta.name = "vil-cache";
  cacheMeta.content = JSON.stringify(cache);
  document.head.appendChild(cacheMeta);
}
