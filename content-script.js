class TextWithContextExtractor {
    constructor () {
        this.invalidTags = new Set([
            "NOSCRIPT",
            "STYLE",
            "SCRIPT"
        ]);
    }

    extract() {
        this.allTextNodesWithContext = new Array();
        this.traverse(document);
        let textContentsWithContext = new Set();
        this.textNodesWithContext = new Set();
        for (let textNodeWithContext of this.allTextNodesWithContext) {
            if (!textContentsWithContext.has(textNodeWithContext.textContent)) {
                textContentsWithContext.add(textNodeWithContext.textContent);
                this.textNodesWithContext.add(textNodeWithContext);
            }
        }
        delete this.allTextNodesWithContext;
        return this.textNodesWithContext;
    }

    tagName(element) {
        return element.tagName.toUpperCase();
    }

    isSpan(element) {
        return this.tagName(element) === "SPAN";
    }

    isValidTextNode(element) {
        return element.textContent.length !== 0 && !this.invalidTags.has(this.tagName(element));
    }

    traverse(element) {
        if (element.children.length === 0) {
            if (!this.isValidTextNode(element)) {
                return;
            }
            while (this.isSpan(element)) {
                element = element.parentElement;
            }
            this.allTextNodesWithContext.push(new TextNodeWithContext(element));
        } else {
            for (let c of element.children) {
                this.traverse(c);
            }
        }
    }
}

class TextNodeWithContext {
    constructor (node) {
        this.node = node;
        this.textContent = this.getTextContent();
    }

    getTextContent() {
        if (this.node.children.length === 0) {
            return this.node.textContent;
        }
        let textContents = new Array();
        for (let c of this.node.children) {
            textContents.push(new TextNodeWithContext(c).textContent);
        }
        return textContents.join(" ");
    }
}

let Status = {
    status: STATUS.NOT_EXTRACTING,
    popupId: null,
    amountOfEntities: null,
    entitiesFetched: null
};

function sendMessageToPopup(message, data) {
    chrome.runtime.sendMessage(new Message(message, { id: Status.popupId, ...data }));
}

function extract() {
    let tx = new TextWithContextExtractor();
    let entities = tx.extract();
    Status.amountOfEntities = entities.size;
    Status.entitiesFetched = 0;
    sendMessageToPopup(Message.Status, { status: Status });
    let fakeProgress = () => {
        sendMessageToPopup(Message.EntityFetched);
        Status.entitiesFetched++;
        if (Status.entitiesFetched < Status.amountOfEntities) {
            setTimeout(fakeProgress, 50);
        }
    };
    fakeProgress();
        /*
    for (let e of entities) {
        fetch("https://api.wit.ai/message?v=20191118&q=" + encodeURIComponent(e.textContent), {
            "headers": { "Authorization": "Bearer 4YZFTVFWZXQCD446DUWWHU7YX7DXRYZN" }
        }).then(response => {
            return response.json();
        }).then(json => {
            e.parsedEntities = json.entities;
        });
        break;
    }
        */
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case Message.GetStatus:
            Status = { ...Status, ...request.data };
            sendResponse(new Message(Message.Status, { status: Status }));
            break;
        case Message.Extract:
            Status.status = STATUS.EXTRACTING;
            Status.popupId = request.data.id;
            setTimeout(extract, 0);
            break;
    }
});
