function setProgress(progress) {
    var bar = document.querySelector("#bar");
    progress *= 100;
    bar.style.width = progress + "%";
}

function sendMessageToActiveTab(message, onResponse) {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
        if (tabs.length != 1) {
            return;
        }
        let tab = tabs[0];
        chrome.tabs.sendMessage(tab.id, message, onResponse);
    });
}

sendMessageToActiveTab(new Message(Message.GetStatus), datextime_status => {
    window.datextime_status = datextime_status;
});

window.datextime_status = STATUS.UNKNOWN;

window.addEventListener("load", e => {
    document.querySelector("#btn-extract").addEventListener("click", e => {
        sendMessageToActiveTab(new Message(Message.Extract));
    });
});
