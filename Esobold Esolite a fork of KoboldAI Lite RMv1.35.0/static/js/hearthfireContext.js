let checkForPendingRequest = () => {
    return !!pending_response_id
}

window.alias = (func, before, after) => {
  return (...args) => {
    let moddedArgs = before !== undefined ? before(...args) || args : args;
    let rtn = func(...moddedArgs);
    if (rtn !== undefined && typeof rtn === "object" && typeof rtn?.then === "function") {
        return after !== undefined ? rtn.then(after) || rtn : rtn;
    }
    return after !== undefined ? after(rtn) || rtn : rtn;
  }
}

let getHashForContext = () => cyrb_hash(concat_gametext(true), 0, 8);

let previousContentHash;
let triggerHearthfireRequest = () => {
    if (localsettings.hearthfireContext) {
        let currentContentHash = getHashForContext();
        let hasContentChanged = currentContentHash !== previousContentHash;
        previousContentHash = currentContentHash;
        if (hasContentChanged) {
            console.log("Content has changed, triggering Hearthfire request");
            try
            {
                window.hearthfireGenActive = true;
                // Temporarily override the submit length
                let og_finalize_submit_payload = finalize_submit_payload;
                finalize_submit_payload = alias(og_finalize_submit_payload, (submit_payload) => {
                    if (submit_payload && submit_payload.params) {
                        submit_payload.params.max_length = 1;
                    }
                    return submit_payload;
                }, undefined);

                // Trigger warmup request here
                submit_generation("").then(() => {
                    // Reset the override
                    finalize_submit_payload = og_finalize_submit_payload;
                    console.log("Hearthfire request finished");
                })
            }
            catch(e)
            {
                console.error("Error during Hearthfire request:", e);
            }
            finally
            {
                window.hearthfireGenActive = false;
            }
        }
    }
}