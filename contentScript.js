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
  let body = document.getElementById("react-root");
  if (!body)
    return;

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
    return tweet.querySelector("a").getAttribute("href").replace(/^\//, "");
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

  function checkMutations(mutationList)
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

  new MutationObserver(reportErrors(checkMutations)).observe(body, {
    childList: true,
    attributes: true,
    subtree: true
  });
}

function implementBlockAll()
{
  const actionClass = "ProfileHeading-action--enhanced-block-all";

  let container = document.getElementById("page-container");
  if (!container)
    return;

  let action = null;

  function injectScript(event)
  {
    event.preventDefault();

    // Firefox doesn't execute content script requests with the page's Origin
    // header, so we need to inject this into the page.
    let script = document.createElement("script");
    script.async = false;
    script.src = chrome.runtime.getURL("blockAll.js");
    document.body.appendChild(script);
    document.body.removeChild(script);
  }

  function checkMutations(mutationList)
  {
    let heading = container.querySelector(".ProfileHeading");
    if (!heading)
      return;

    let content = heading;
    do
    {
      content = content.nextElementSibling;
    } while (content && !content.offsetHeight);
    if (!content)
      return;

    let profiles = content.querySelectorAll(".ProfileCard");
    if (!profiles.length)
      return;

    for (let existing of heading.querySelectorAll("." + actionClass))
      if (existing != action)
        existing.parentNode.removeChild(existing);

    if (action && action.isConnected)
    {
      if (action.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_CONTAINS)
        return;
      action.parentNode.removeChild(action);
    }

    action = document.createElement("button");
    action.className = "plain-btn js-tooltip " + actionClass;
    action.style.color = "#e0245e";
    action.dataset.originalTitle = chrome.i18n.getMessage("block_all_title");
    action.addEventListener("click", reportErrors(injectScript));

    let icon = document.createElement("span");
    icon.className = "Icon Icon--medium Icon--report";
    action.appendChild(icon);

    let icon2 = document.createElement("span");
    icon2.className = icon.className;
    icon2.style.position = "relative";
    icon2.style.left = "-8px";
    icon2.style.top = "4px";
    action.appendChild(icon2);

    let parent = heading.querySelector(".ProfileHeading-toggleItem.is-active");
    if (!parent)
      parent = heading.querySelector(".ProfileHeading-content");
    if (!parent)
      parent = heading;
    parent.insertBefore(action, parent.firstChild);
  }

  new MutationObserver(reportErrors(checkMutations)).observe(container, {
    childList: true
  });
  checkMutations();
}

implementLikeThread();
implementBlockAll();
