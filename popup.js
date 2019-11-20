function setProgress(progress) {
    var bar = document.querySelector("#bar");
    progress *= 100;
    bar.style.width = progress + "%";
}

function sendMessageToActiveTab(message, onResponse) {
    chrome.tabs.sendMessage(Status.popupId, message, onResponse);
}

function showSection(id) {
    console.log("showSection ", id);
    let allSections = document.querySelectorAll("body > section");
    let sectionToActivate = document.querySelector("#" + id);
    for (let section of allSections) {
        section.classList.remove("active");
    }
    sectionToActivate.classList.add("active");
}

function updateProgressbar() {
    let $bar = document.querySelector("#bar");
    $bar.style.width = (Status.entitiesFetched / Status.amountOfEntities * 100) + "%";
}

function updateStatus(status) {
    console.log("updateStatus", status);
    Status = { ...Status, ...status };
    if (Status.status === STATUS.EXTRACTING) {
        updateProgressbar();
    }
    showSection(Status.status);
}

let Status = {
    status: STATUS.UNKNOWN,
    popupId: -1,
    amountOfEntities: null,
    entitiesFetched: null,
};

window.addEventListener("load", e => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
        if (tabs.length != 1) {
            return;
        }
        Status.popupId = tabs[0].id;
        sendMessageToActiveTab(new Message(Message.GetStatus, { popupId: Status.popupId }), response => {
            updateStatus(response.data.status);
        });
        document.querySelector("#btn-extract").addEventListener("click", e => {
            sendMessageToActiveTab(new Message(Message.Extract, { id: Status.popupId }));
        });
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request.data || request.data.id !== Status.popupId) {
        return;
    }
    switch (request.type) {
        case Message.Status:
            updateStatus(request.data.status);
            break;
        case Message.EntityFetched:
            Status.entitiesFetched++;
            updateProgressbar();
            break;
    }
});
