var n = document.querySelectorAll("script");
for (let o of Array.from(n)) {
  if (o.type !== "module") continue;
  let t = o.dataset.invokeHook;
  t !== void 0 && import(o.src).then((e) => e[t]());
}
