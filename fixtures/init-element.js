function childLoad(args) {
  if (args?.listId !== "main-list") {
    return;
  }
  const rootElt = args?.root ?? document;

  const listItems = rootElt.querySelectorAll("li");
  for (const listItem of listItems) {
    if (listItem.getAttribute("data-initialized") === "true") {
      continue;
    }

    listItem.addEventListener("click", () => {
      console.warn(`Clicked on ${listItem.textContent}`);
    });
    const textContent = listItem.textContent;
    listItem.textContent = `${textContent} ${listItem.dataset["itemId"]}`;
    listItem.setAttribute("data-initialized", "true");
  }
}

function childUnload() {
  const listItems = document.querySelectorAll("li[data-initialized=true]");
  for (const listItem of listItems) {
    listItem.removeAttribute("data-initialized");
    listItem.textContent = "Item";
  }
}

export const vilHooks = {
  childLoad,
  childUnload,
};
