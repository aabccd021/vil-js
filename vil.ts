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

type Cache = {
  cacheSnapshot: CacheSnapshot;
  scrollOffset: number;
};

type Hook = (...args: unknown[]) => unknown;

type LoadHooks = <T extends string[]>(hookNames: T) => Promise<{ [K in keyof T]: Hook[] }>;

type HookLoaderModule = {
  loadHooks: LoadHooks;
};

async function infiniteScroll(args: {
  vilItemsAppendHooks: Hook[];
  next: HTMLAnchorElement;
  triggers: NodeListOf<Element>;
}): Promise<void> {
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

      const newContainer = newDoc.querySelector("[data-vil-container]");
      if (newContainer === null) {
        return;
      }

      const newTriggers = newContainer.querySelectorAll("[data-vil-trigger]");
      for (const trigger of Array.from(triggers)) {
        trigger.removeAttribute("data-vil-trigger");
      }
      triggers = newTriggers;

      for (const hook of args.vilItemsAppendHooks) {
        hook({ document: newDoc });
      }

      const newChildren = Array.from(newContainer.children);

      const htmlElChildren = newChildren.filter((child) => child instanceof HTMLElement);

      if (htmlElChildren.length !== newChildren.length) {
        throw new Error("Non-HTMLElement children found");
      }

      appendItems(virt, htmlElChildren);

      const newNext = newDoc.querySelector<HTMLAnchorElement>("a[data-vil-next]");
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

let virt: Virtualizer;
let container: HTMLElement;

let vilListUnloadHooks: Hook[] = [];

export async function load(): Promise<void> {
  const containerElt = document.body.querySelector("[data-vil-container]");
  if (!(containerElt instanceof HTMLElement)) {
    throw new Error("Container is not an HTMLElement");
  }
  container = containerElt;

  let vilItemsAppendHooks: Hook[] = [];

  const hookLoader = document.querySelector<HTMLScriptElement>("script[data-hook-loader]");
  if (hookLoader !== null) {
    const hookLoaderModule: HookLoaderModule = await import(hookLoader.src);
    [vilItemsAppendHooks, vilListUnloadHooks] = await hookLoaderModule.loadHooks([
      "VilItemsAppend",
      "VilListUnload",
    ] as const);
  }

  const cacheMeta = document.querySelector<HTMLMetaElement>('meta[name="vil-cache"]');
  cacheMeta?.remove();
  const cache = JSON.parse(cacheMeta?.content ?? "null");

  const root = containerElt.parentElement;
  if (root === null) {
    throw new Error("Root not found");
  }

  const triggers = containerElt.querySelectorAll("[data-vil-trigger]");
  const next = document.body.querySelector<HTMLAnchorElement>("a[data-vil-next]");

  for (const hook of vilItemsAppendHooks) {
    hook({ document });
  }

  if (cache !== undefined) {
    for (const item of Array.from(containerElt.children)) {
      if (!(item instanceof HTMLElement)) {
        console.error("Item is not an HTMLElement");
        continue;
      }
      item.style.visibility = "visible";
      item.style.position = "absolute";
    }
  }

  virt = initVirtualizer({
    container: containerElt,
    cache: cache?.cacheSnapshot,
    totalSizeStyle: "height",
    offsetStyle: "top",
    root,
  });

  scrollTo(virt, cache?.scrollOffset);

  if (next !== null) {
    infiniteScroll({ next, triggers, vilItemsAppendHooks });
  }
}

export function unload(): void {
  const cacheSnapshot = getCacheSnapshot(virt);
  const scrollOffset = getScrollOffset(virt);
  const cache: Cache = { cacheSnapshot, scrollOffset };

  dispose(virt);

  for (const item of virt.items) {
    item.style.visibility = "visible";
    container.appendChild(item);
  }

  for (const hook of vilListUnloadHooks) {
    hook();
  }

  const cacheMeta = document.createElement("meta");
  cacheMeta.name = "vil-cache";
  cacheMeta.content = JSON.stringify(cache);
  document.head.appendChild(cacheMeta);
}
