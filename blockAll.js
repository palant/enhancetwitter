/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

(async function blockAll()
{
  function extractId()
  {
    let match = /\/status\/(\d+)/.exec(location.href);
    if (!match)
      return null;
    return match[1];
  }

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

  let action = document.querySelector(".enhancetwitter-block-all");
  if (action)
    action.style.animation = "rotation 1s infinite linear";

  try
  {
    async function apiCall(endpoint, params, isPost)
    {
      let url = "https://api.twitter.com/" + endpoint + ".json";
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

    let id = extractId();
    let token = await fetchToken();
    let csrfToken = extractTokenFromCookies();
    if (!id || !token || !csrfToken)
      return;

    let response = await apiCall("2/timeline/liked_by", {
      include_blocking: 1,
      skip_status: 1,
      send_error_codes: true,
      tweet_id: id,
      count: 1000
    });
    let users = Object.keys(response.globalObjects.users);

    for (let i = 0; i < users.length; i += 10)
    {
      let current = users.slice(i, i + 10);
      let calls = current.map(id => apiCall("1.1/blocks/create", {user_id: id, skip_status: true}, true));
      await Promise.all(calls);
    }
  }
  finally
  {
    if (action)
      action.style.animation = "";
  }
})();
