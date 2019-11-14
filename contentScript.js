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
  const actionClass = "ProfileTweet-action--enhanced-favorite-thread";
  const threadSelector = `
    .tweet.ancestor,
    .tweet.js-original-tweet,
    .ThreadedConversation--selfThread .tweet.descendant
  `;

  let action = null;
  let body = document.querySelector(".PermalinkOverlay-body");
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

  function likeThread(event, doLike)
  {
    event.preventDefault();

    for (let tweet of document.querySelectorAll(threadSelector))
    {
      if (tweet.classList.contains("favorited") != doLike)
        tweet.querySelector(".ProfileTweet-actionButton.js-actionFavorite").click();
    }
  }

  function checkMutations(mutationList)
  {
    if (mutationList.every(isOwnMutation))
      return;

    let tweets = body.querySelectorAll(threadSelector);
    if (tweets.length < 2)
      return;

    let favorited = 0;
    for (let tweet of tweets)
      if (tweet.classList.contains("favorited"))
        favorited++;

    let root = tweets[0];
    if (action && action.isConnected)
    {
      if (action._set == (favorited == tweets.length) && (action.compareDocumentPosition(root) & Node.DOCUMENT_POSITION_CONTAINS))
        return;
      action.parentNode.removeChild(action);
    }

    action = document.createElement("div");
    action.className = "ProfileTweet-action " + actionClass;
    action._set = (favorited == tweets.length);

    let button = document.createElement("button");
    button.className = "ProfileTweet-actionButton";
    button.addEventListener("click", reportErrors(event => likeThread(event, !action._set)));
    action.appendChild(button);

    let container = document.createElement("div");
    container.className = "IconContainer js-tooltip";
    container.dataset.originalTitle = chrome.i18n.getMessage("like_thread_title");
    button.appendChild(container);

    let icon = document.createElement("span");
    icon.className = "Icon Icon--medium " + (action._set ? "Icon--heartBadge" : "Icon--heart");
    container.appendChild(icon);

    let icon2 = document.createElement("span");
    icon2.className = icon.className;
    icon2.style.position = "relative";
    icon2.style.left = "-12px";
    icon2.style.top = "4px";
    container.appendChild(icon2);

    let favoriteAction = root.querySelector(".ProfileTweet-actionList > .ProfileTweet-action--favorite");
    favoriteAction.parentNode.insertBefore(action, favoriteAction.nextSibling);
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
