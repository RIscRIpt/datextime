chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
    case Message.Activate:
        chrome.pageAction.show(sender.tab.id);
        break;
    }
});
