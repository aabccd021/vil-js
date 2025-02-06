export function load(args) {
  const doc = args?.document ?? document;

  const listItems = doc.body.querySelectorAll("li");
  for (const listItem of listItems) {
    listItem.addEventListener("click", () => console.warn(`Clicked on ${listItem.textContent}`));

    listItem.textContent = `${listItem.textContent} ${listItem.dataset["itemId"]}`;
  }
}

export function unload(args) {
  const doc = args?.document ?? document;
  const listItems = doc.querySelectorAll("li");
  for (const listItem of listItems) {
    listItem.textContent = "Item";
  }
}
