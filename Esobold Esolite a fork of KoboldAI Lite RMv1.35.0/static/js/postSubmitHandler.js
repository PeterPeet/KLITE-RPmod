let lastPendingResponse = null, waitingForCompletion = false
setInterval(() => {
    if (waitingForCompletion && !pending_response_id) {
        treeHandler.addTreeBranch(concat_gametext())
        triggerHearthfireRequest()
        waitingForCompletion = false
    }
    else if (!!pending_response_id && !waitingForCompletion && pending_response_id !== lastPendingResponse) {
        waitingForCompletion = true
        lastPendingResponse = pending_response_id
    }
}, 1000)