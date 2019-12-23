function setProgress(progress) {
    var bar = document.querySelector("#bar");
    progress *= 100;
    bar.style.width = progress + "%";
}

function sendMessageToActiveTab(message, onResponse) {
    chrome.tabs.sendMessage(Status.popupId, message, onResponse);
}

function highlighEntry() {
    let path = this.getAttribute("path");
    sendMessageToActiveTab(new Message(Message.Highlight, { path: path }));
}

function lowlightEntry() {
    let path = this.getAttribute("path");
    sendMessageToActiveTab(new Message(Message.Lowlight, { path: path }));
}

function showSection(id) {
    let allSections = document.querySelectorAll("body > section");
    let sectionToActivate = document.querySelector("#" + id);
    for (let section of allSections) {
        section.classList.remove("active");
    }
    sectionToActivate.classList.add("active");
}

function updateProgress() {
    let $bar = document.querySelector("#bar");
    let $textProgress = document.querySelector("#text-progress");
    let $amount = document.querySelector("#amount");
    let $totalAmount = document.querySelector("#total-amount");
    $bar.style.width = (Status.fetchedEntries.length / Status.amountOfEntries * 100) + "%";
    $amount.textContent = Status.fetchedEntries.length;
    $totalAmount.textContent = Status.amountOfEntries;
    $textProgress.style.visibility = "visible";
}

function highlightEntryContext(entry, context) {
    let startPosition = context.toLowerCase().indexOf(entry.text.toLowerCase());
    if (startPosition !== -1) {
        let endPosition = startPosition + entry.text.length;
        context =
            context.substring(0, startPosition) +
            "<strong>" +
            context.substring(startPosition, endPosition) +
            "</strong>" +
            context.substring(endPosition);
    }
    return context;
}

function createEntryElement(entry, context, path) {
    let $entry = document.createElement("div");
    $entry.classList.add("entry");
    let $entryValue = document.createElement("span");
    let $entryContext = document.createElement("span");
    $entryValue.classList.add("entry-value");
    $entryContext.classList.add("entry-context");
    $entryValue.textContent = entry.text;
    $entryContext.innerHTML = highlightEntryContext(entry, context);
    $entry.appendChild($entryValue);
    $entry.appendChild($entryContext);
    $entry.setAttribute("path", path);
    $entry.addEventListener("mouseover", highlighEntry);
    $entry.addEventListener("mouseleave", lowlightEntry);
    return $entry;
}

function createEntryWrapper() {
    let $wrapper = document.createElement("div");
    $wrapper.setAttribute("id", "entries-wrapper");
    let $header = document.createElement("div");
    $header.classList.add("entry", "header");
    let $value = document.createElement("span");
    $value.classList.add("entry-value");
    $value.textContent = "Entry";
    let $context = document.createElement("span");
    $context.classList.add("entry-context");
    $context.textContent = "Context";
    $header.appendChild($value);
    $header.appendChild($context);
    $wrapper.appendChild($header);
    return $wrapper;
}

function updateEntries() {
    if (Status.entriesShown) {
        return;
    }
    Status.entriesShown = true;
    let $entries = document.querySelector("#entries");
    let $entriesWrapper = document.querySelector("#entries-wrapper");
    let $newEntriesWrapper = createEntryWrapper();
    for (let entry of Status.fetchedEntries) {
        for (let e of entry.entries) {
            let element = createEntryElement(e, entry.context, entry.path);
            $newEntriesWrapper.appendChild(element);
        }
    }
    $entries.removeChild($entriesWrapper);
    $entries.appendChild($newEntriesWrapper);
}

function displayEntry(entry) {
    let $entriesWrapper = document.querySelector("#entries-wrapper");
    for (let e of entry.entries) {
        let element = createEntryElement(e, entry.context, entry.path);
        $entriesWrapper.appendChild(element);
    }
}

function updateStatus(status) {
    Status = { ...Status, ...status };
    switch (Status.status) {
        case STATUS.NOT_EXTRACTING:
            sendMessageToActiveTab(new Message(Message.Extract, { id: Status.popupId }));
            break;
        case STATUS.EXTRACTING:
            updateProgress();
            updateEntries();
            break;
        case STATUS.EXTRACTED:
            updateEntries();
            break;
    }
    showSection(Status.status);
}

let Status = {
    status: STATUS.UNKNOWN,
    popupId: -1,
    amountOfEntries: null,
    fetchedEntries: [],
    entriesShown: false,
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
            Status.fetchedEntries.push(request.data);
            updateProgress();
            displayEntry(request.data);
            break;
    }
});
