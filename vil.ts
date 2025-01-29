import {
  type CacheSnapshot,
  type InitResult as VirtuaInitResult,
  type Context as VlistContext,
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
  vlistContext: VlistContext;
  next: HTMLAnchorElement;
  triggers: NodeListOf<Element>;
}): Promise<void> {
  const { listId, hooks, vlistContext } = args;
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

      const newRoot = newContainer.parentElement;
      if (newRoot === null) {
        console.warn("No parent found for new container");
        return;
      }

      const newTriggers = newRoot.querySelectorAll(`[data-vil-trigger="${listId}"]`);
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

      appendChildren(vlistContext, htmlElChildren);

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

  invokeHooks(hooks, "VilItemsAppend", { listId });

  const listCache = cache?.[listId];

  const vList = vListInit({
    container,
    cache: listCache?.virtuaSnapshot,
    scrollOffset: listCache?.scrollOffset,
  });

  if (next !== null) {
    infiniteScroll({
      listId,
      hooks,
      vlistContext: vList.context,
      next,
      triggers,
    });
  }

  return { vList, container, listId };
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

  lists = Array.from(containers).map((container) => initContainer(container, cache));
}

export function unload(): void {
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

  invokeHooks(hooks, "VilListUnload", {});

  const cacheMeta = document.createElement("meta");
  cacheMeta.name = "vil-cache";
  cacheMeta.content = JSON.stringify(cache);
  document.head.appendChild(cacheMeta);
}
