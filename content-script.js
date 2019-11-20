class TextWithContextExtractor {
    constructor () {
        this.TEXT_WRAPPER_TAGS = new Set([
            "A",
            "ABBR",
            "ADDRESS",
            "B",
            "BDI",
            "BDO",
            "FONT",
            "H1",
            "H2",
            "H3",
            "H4",
            "H5",
            "H6",
            "I",
            "PARAM",
            "Q",
            "S",
            "SPAN",
            "STRIKE",
            "STRONG",
            "SUB",
            "SUP",
            "TIME",
            "U"
        ]);

        this.INVALID_TAGS = new Set([
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

    isWrapped(element) {
        return this.TEXT_WRAPPER_TAGS.has(this.tagName(element));
    }

    isValidTextNode(element) {
        return element.textContent.length !== 0 && !this.INVALID_TAGS.has(this.tagName(element));
    }

    traverse(element) {
        if (element.children.length === 0) {
            if (!this.isValidTextNode(element)) {
                return;
            }
            while (this.isWrapped(element)) {
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

function isEmpty(object) {
    return Object.entries(object).length === 0 && object.constructor === Object;
}

function extract() {
    let tx = new TextWithContextExtractor();
    let textNodesWithContext = tx.extract();
    Status.amountOfEntities = textNodesWithContext.size;
    Status.entitiesFetched = 0;
    sendMessageToPopup(Message.Status, { status: Status });
    for (let textNode of textNodesWithContext) {
        // wit.ai limitation
        if (textNode.textContent.length > 280) {
            Status.entitiesFetched++;
            sendMessageToPopup(Message.EntityFetched);
            continue;
        }
        fetch("https://api.wit.ai/message?v=20191118&q=" + encodeURIComponent(textNode.textContent), {
            "headers": { "Authorization": "Bearer 4YZFTVFWZXQCD446DUWWHU7YX7DXRYZN" }
        }).then(response => {
            return response.json();
        }).then(json => {
            textNode.parsedEntities = json.entities;
            Status.entitiesFetched++;
            sendMessageToPopup(Message.EntityFetched);
            if (json.entities && !isEmpty(json.entities)) {
                console.log(textNode);
                textNode.node.style.border = "2px dashed blue";
            }
        });
    }
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
