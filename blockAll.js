/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

(async function blockAll()
{
  async function fetchToken()
  {
    let mainUrl = null;
    for (let script of document.body.querySelectorAll("script[src]"))
      if (/\/main\.[^\/]*\.js$/.test(script.src))
        mainUrl = script.src;
    if (!mainUrl)
      return null;

    let response = await fetch(mainUrl);
    let mainSource = await response.text();
    let result = /\"AAAAAAA[^"]+\"/.exec(mainSource);
    if (!result || result.length != 1)
      return null;

    return JSON.parse(result[0]);
  }

  function extractTokenFromCookies()
  {
    let cookies = document.cookie;
    let result = /\bct0=(\w+)/.exec(document.cookie);
    if (!result)
      return null;

    return result[1];
  }

  function* findUsers(node)
  {
    if (!node)
      node = document.getElementById("react-root")._reactRootContainer._internalRoot.current;

    if (node.sibling)
      yield* findUsers(node.sibling);
    if (node.child)
      yield* findUsers(node.child);

    if (!node.stateNode)
      return;

    let props = node.stateNode.props;
    if (!props || !props.scribeNamespace)
      return;

    if (props.scribeNamespace.element != "user")
      return;

    yield node.stateNode;
  }

  async function apiCall(endpoint, params, isPost)
  {
    let url = "https://api.twitter.com/1.1/" + endpoint + ".json";
    if (params && !isPost)
      url += "?" + new URLSearchParams(params).toString();

    let response = await fetch(url, {
      headers: {
        "authorization": "Bearer " + token,
        "x-csrf-token": csrfToken,
        "x-twitter-active-user": "yes",
        "x-twitter-auth-type": "OAuth2Session"
      },
      method: isPost ? "POST": "GET",
      body: isPost && params ? new URLSearchParams(params) : null,
      credentials: "include"
    });
    return await response.json();
  }

  let token = await fetchToken();
  let csrfToken = extractTokenFromCookies();
  if (!token || !csrfToken)
    return;

  let components = new Map();
  for (let component of findUsers())
    components.set(component.props.userId, component);

  let screenName = window.location.pathname.split("/")[1];
  let params = {
    screen_name: screenName,
    stringify_ids: true,
    count: 5000,
  };
  let response = await apiCall("followers/ids", params);
  let ids = response.ids;
  while (response.next_cursor)
  {
    params.cursor = response.next_cursor;

    response = await apiCall("followers/ids", params);
    ids.push(...response.ids);
  }

  for (let i = 0; i < ids.length; i += 10)
  {
    let current = ids.slice(i, i + 10);
    let calls = current.map(id => apiCall("blocks/create", {user_id: id, skip_status: true}, true));
    await Promise.all(calls);

    for (let id of current)
    {
      let component = components.get(id);
      if (component)
      {
        component.props.user.blocked_by = true;
        component.forceUpdate();
      }
    }
  }
})();
