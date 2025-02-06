let abortController;

export function load(args) {
  const doc = args?.document ?? document;
  abortController = new AbortController();

  const listItems = doc.body.querySelectorAll("li");
  for (const listItem of listItems) {
    listItem.addEventListener(
      "click",
      () => {
        console.warn(`Clicked on ${listItem.textContent}`);
      },
      { signal: abortController.signal },
    );

    listItem.textContent = `${listItem.textContent} ${listItem.dataset["itemId"]}`;
  }
}

export function unload(args) {
  const doc = args?.document ?? document;
  abortController?.abort();
  const listItems = doc.querySelectorAll("li");
  for (const listItem of listItems) {
    listItem.textContent = "Item";
  }
}
