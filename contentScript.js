/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

function reportErrors(callback)
{
  return function(...args)
  {
    try
    {
      return callback(...args);
    }
    catch(e)
    {
      console.error(e);
      throw e;
    }
  };
}

function implementLikeThread()
{
  const actionClass = "enhancetwitter-favorite-thread";
  let action = null;

  function isOwnMutation(mutation)
  {
    if (mutation.type != "childList")
      return false;

    let nodes = null;
    if (mutation.addedNodes.length && !mutation.removedNodes.length)
      nodes = mutation.addedNodes;
    else if (!mutation.addedNodes.length && mutation.removedNodes.length)
      nodes = mutation.removedNodes;
    else
      return false;

    return [...nodes].every(node => node.classList.contains(actionClass));
  }

  function getUsername(tweet)
  {
    let username = tweet.querySelector("a");
    if (username)
      return username.getAttribute("href").replace(/^\//, "");
    else
      return null;
  }

  function* selectThread()
  {
    let tweets = document.querySelectorAll("article");
    if (!tweets.length)
      return;

    let username = getUsername(tweets[0]);
    yield tweets[0];
    for (let i = 1; i < tweets.length; i++)
    {
      if (getUsername(tweets[i]) == username)
        yield tweets[i];
      else
        return;
    }
  }

  function likeThread(event, doLike)
  {
    event.preventDefault();

    for (let tweet of selectThread())
    {
      let button = tweet.querySelector(doLike ? "[data-testid=like]" : "[data-testid=unlike]");
      if (button)
        button.click();
    }
  }

  return function checkMutations(mutationList)
  {
    if (mutationList.every(isOwnMutation))
      return;

    let tweets = [...selectThread()];
    if (tweets.length < 2)
      return;

    let favorited = 0;
    for (let tweet of tweets)
      if (tweet.querySelector("[data-testid=unlike]"))
        favorited++;

    let root = tweets[0];
    if (action && action.isConnected)
    {
      if (action._set == (favorited == tweets.length) && (action.compareDocumentPosition(root) & Node.DOCUMENT_POSITION_CONTAINS))
        return;
      action.parentNode.removeChild(action);
    }

    let template = root.querySelector("[data-testid=like],[data-testid=unlike]").parentNode;
    action = template.cloneNode(true);
    action.classList.add(actionClass);
    action._set = (favorited == tweets.length);
    action.addEventListener("click", reportErrors(event => likeThread(event, !action._set)));

    let path = action.querySelector("path");
    if (action._set)
      path.setAttribute("d", "M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z");
    else
      path.setAttribute("d", "M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12zM7.354 4.225c-2.08 0-3.903 1.988-3.903 4.255 0 5.74 7.034 11.596 8.55 11.658 1.518-.062 8.55-5.917 8.55-11.658 0-2.267-1.823-4.255-3.903-4.255-2.528 0-3.94 2.936-3.952 2.965-.23.562-1.156.562-1.387 0-.014-.03-1.425-2.965-3.954-2.965z");

    let path2 = path.cloneNode(true);
    path.setAttribute("transform", "scale(0.75)");
    path2.setAttribute("transform", "scale(0.75) translate(6 6)");
    path.parentNode.appendChild(path2);

    template.parentNode.insertBefore(action, template.nextSibling);
  }
}

function implementBlockAll()
{
  const actionClass = "enhancetwitter-block-all";
  let action = null;

  function injectScript(event)
  {
    // Firefox doesn't execute content script requests with the page's Origin
    // header, so we need to inject this into the page.
    let script = document.createElement("script");
    script.async = false;
    script.src = chrome.runtime.getURL("blockAll.js");
    document.body.appendChild(script);
    document.body.removeChild(script);
  }

  return function checkMutations(mutationList)
  {
    let modal = document.querySelector("#layers [aria-modal=true]");
    if (!modal)
      return;

    let header = modal.querySelector("#modal-header");
    if (!header || header.textContent != "Liked by")
      return;

    if (action && action.isConnected)
    {
      if (action.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_CONTAINS)
        return;
      action.parentNode.removeChild(action);
    }

    action = new DOMParser().parseFromString(`
      <svg viewBox="0 0 24 24">
        <style>
          @keyframes rotation {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(359deg);
            }
          }
        </style>
        <g>
          <path transform="scale(0.75)" d="M12 1.25C6.072 1.25 1.25 6.072 1.25 12S6.072 22.75 12 22.75 22.75 17.928 22.75 12 17.928 1.25 12 1.25zm0 1.5c2.28 0 4.368.834 5.982 2.207L4.957 17.982C3.584 16.368 2.75 14.282 2.75 12c0-5.1 4.15-9.25 9.25-9.25zm0 18.5c-2.28 0-4.368-.834-5.982-2.207L19.043 6.018c1.373 1.614 2.207 3.7 2.207 5.982 0 5.1-4.15 9.25-9.25 9.25z" />
          <path transform="scale(0.75) translate(6 6)" d="M12 1.25C6.072 1.25 1.25 6.072 1.25 12S6.072 22.75 12 22.75 22.75 17.928 22.75 12 17.928 1.25 12 1.25zm0 1.5c2.28 0 4.368.834 5.982 2.207L4.957 17.982C3.584 16.368 2.75 14.282 2.75 12c0-5.1 4.15-9.25 9.25-9.25zm0 18.5c-2.28 0-4.368-.834-5.982-2.207L19.043 6.018c1.373 1.614 2.207 3.7 2.207 5.982 0 5.1-4.15 9.25-9.25 9.25z" />
        </g>
      </svg>`, "text/html").body.firstChild;
    action = document.importNode(action, true);
    action.classList.add(actionClass);
    action.style.fill = "#e0245e";
    action.style.width = "1.5em";
    action.style.height = "1.5em";
    action.style.verticalAlign = "middle";
    action.style.cursor = "pointer";
    action.addEventListener("click", reportErrors(event =>
    {
      event.preventDefault();

      if (!action.style.animation)
        injectScript();
    }));

    header.appendChild(action);
  }
}

let mutationListeners = [
  implementLikeThread(),
  implementBlockAll()
];

function checkMutations(mutationList)
{
  for (let listener of mutationListeners)
    listener(mutationList);
}

let root = document.getElementById("react-root");
if (root)
{
  new MutationObserver(reportErrors(checkMutations)).observe(root, {
    childList: true,
    attributes: true,
    subtree: true
  });
}
