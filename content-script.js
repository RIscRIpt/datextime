class TextWithContextExtractor {
    constructor () {
        this.TEXT_WRAPPER_TAGS = new Set([
            "A",
            "ABBR",
            "ADDRESS",
            "B",
            "BR",
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
        let textNodesWithContext = new Set();
        this.textNodesWithContext = new Set();
        for (let textNodeWithContext of this.allTextNodesWithContext) {
            if (!textNodesWithContext.has(textNodeWithContext.node)) {
                textNodesWithContext.add(textNodeWithContext.node);
                this.textNodesWithContext.add(textNodeWithContext);
            }
        }
        delete this.allTextNodesWithContext;
        return this.textNodesWithContext;
    }

    tagName(element) {
        if (!element.tagName) {
            return "";
        }
        return element.tagName.toUpperCase();
    }

    isWrapped(element) {
        return this.TEXT_WRAPPER_TAGS.has(this.tagName(element));
    }

    allChildrenWrapped(parent) {
        for (let element of parent.children) {
            if (!this.isWrapped(element)) {
                return false;
            }
        }
        return true;
    }

    isValidTextNode(element) {
        return element.textContent.trim().length && !this.INVALID_TAGS.has(this.tagName(element));
    }

    hasTextNodes(element) {
        for (let node of element.childNodes) {
            if (node.nodeName === "#text" && this.isValidTextNode(node))
                return true;
        }
        return false;
    }

    traverse(element) {
        if (element.children.length === 0 || this.hasTextNodes(element)) {
            if (!this.isValidTextNode(element)) {
                return;
            }
            let parent = element;
            while (this.isWrapped(parent)) {
                parent = parent.parentElement;
            }
            if (this.allChildrenWrapped(parent)) {
                element = parent;
            }
            let textNodeWithContext = new TextNodeWithContext(element);
            if (textNodeWithContext.textContent) {
                this.allTextNodesWithContext.push(textNodeWithContext);
            }
        } else {
            for (let c of element.children) {
                this.traverse(c);
            }
        }
    }
}

const INLINE_NODE_STYLES = new Set([
    "contents",
    "inline",
    "inline-block",
    "inline-flex",
    "inline-grid",
    "inline-table"
]);

function isNodeInline(node) {
    return INLINE_NODE_STYLES.has(getComputedStyle(node).display);
}

function isVisible(node) {
    const styles = getComputedStyle(node);
    return styles.display !== "none" && styles.visibility === "visible" && parseFloat(styles.opacity) > 0;
}

class TextNodeWithContext {
    constructor (node) {
        this.node = node;
        this.getTextContent();
    }

    getTextContent() {
        this.textContent = "";
        if (isVisible(this.node)) {
            if (this.node.childNodes.length > 1) {
                let textContents = [];
                let addSpace = false;
                for (let c of this.node.childNodes) {
                    if (c.nodeName === "#text") {
                        textContents.push(c.textContent);
                        addSpace = false;
                    } else {
                        if (addSpace || !isNodeInline(c)) {
                            textContents.push(" ");
                        }
                        textContents.push(new TextNodeWithContext(c).textContent);
                        addSpace = true;
                    }
                }
                this.textContent = textContents.join("").trim();
            } else {
                this.textContent = this.node.textContent.trim();
            }
        }
        return this.textContent;
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
    let ner = new NER();
    let tx = new TextWithContextExtractor();
    let textNodesWithContext = tx.extract();
    Status.amountOfEntities = textNodesWithContext.size;
    Status.entitiesFetched = 0;
    sendMessageToPopup(Message.Status, { status: Status });
    for (let textNode of textNodesWithContext) {
        let result = ner.parse(textNode.textContent);
        if (result) {
            textNode.node.style.border = "2px dashed blue";
            Status.entitiesFetched++;
            sendMessageToPopup(Message.EntityFetched);
            console.log(result);
        }
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
