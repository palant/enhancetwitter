/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

(async function blockAll()
{
  let data = new URLSearchParams();
  data.set("authenticity_token", document.getElementById("authenticity_token").value);
  data.set("challenges_passed", "false");
  data.set("handles_challenges", "1");
  data.set("impression_id", "");

  for (let profile of document.querySelectorAll(".AppContainer .ProfileCard"))
  {
    let actions = profile.querySelector(".user-actions");
    if (actions.classList.contains("blocked"))
      continue;

    data.set("user_id", profile.dataset.userId);

    let response = await fetch("/i/user/block", {
      method: "POST",
      body: data,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-Twitter-Active-User": "yes"
      }
    });

    if (response.ok)
    {
      actions.classList.remove("not-following", "following", "pending");
      actions.classList.add("blocked");
    }
  }
})();
