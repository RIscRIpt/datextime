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

class Color {
    constructor (color) {
        if (typeof (color) === "string") {
            let rgba = color.match(/rgba?\((.*)\)/)[1].split(',').map(Number);
            this.red = rgba[0];
            this.green = rgba[1];
            this.blue = rgba[2];
            if ("3" in rgba) {
                this.alpha = rgba[3];
            }
        } else {
            this.red = color.red;
            this.green = color.green;
            this.blue = color.blue;
            this.alpha = color.alpha;
        }
    }

    isTransparent() {
        return this.alpha === 0;
    }

    getFixed() {
        if (this.isTransparent()) {
            return new Color({ red: 255, green: 255, blue: 255 });
        }
        return new Color(this);
    }

    getInverted() {
        let inverted = new Color(this);
        inverted.red = 255 - this.red;
        inverted.green = 255 - this.green;
        inverted.blue = 255 - this.blue;
        return inverted;
    }

    toString() {
        let s = "rgb(" + this.red + ", " + this.green + ", " + this.blue;
        if (this.alpha) {
            s += ", " + this.alpha;
        }
        s += ")";
        return s;
    }
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
                        let textNodeWithContext = new TextNodeWithContext(c);
                        textContents.push(textNodeWithContext.textContent);
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

    getRealBackgroundColor(node) {
        let color = new Color(getComputedStyle(node).backgroundColor);
        while (color.isTransparent()) {
            if (!node.parentElement) {
                return color.getFixed();
            }
            node = node.parentElement; 
            color = new Color(getComputedStyle(node).backgroundColor);
        }
        return color;
    }

    highlight(entity) {
        let startIndex = this.node.innerHTML.toLowerCase().lastIndexOf(entity.text.toLowerCase());
        let realBackgroundColor = this.getRealBackgroundColor(this.node);
        let highlightColor = realBackgroundColor.getInverted();
        let boxShadowStyle = "0 0 2px 0 " + highlightColor.toString();
        let colorStyle = realBackgroundColor.toString();
        let paddingStyle = "0 4px";
        let backgroundColorStyle = highlightColor.toString();
        if (startIndex !== -1) {
            let endIndex = startIndex + entity.text.length;
            let html = this.node.innerHTML;
            this.node.innerHTML =
                html.substring(0, startIndex) +
                "<span style='box-shadow: " + boxShadowStyle + "; padding: " + paddingStyle + "; color: " + colorStyle + "; background-color: " + backgroundColorStyle + "; display: inline;'>" +
                html.substring(startIndex, endIndex) +
                "</span>" +
                html.substring(endIndex);
        } else {
            this.node.style.boxShadow = boxShadowStyle;
            this.node.style.padding = paddingStyle;
            this.node.style.color = colorStyle;
            this.node.style.backgroundColor = backgroundColorStyle;
        }
    }
}

let Status = {
    status: STATUS.NOT_EXTRACTING,
    popupId: null,
    amountOfEntries: null,
    fetchedEntries: []
};

let HighlightedEntry = null;

function focusEntry(element) {
    const elementRect = element.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.pageYOffset;
    const middle = absoluteElementTop - (window.innerHeight / 2);
    window.scrollTo(0, middle);
}

function lowlightEntry(element) {
    if (!element) {
        return;
    }
    element.classList.remove("__dxt_highlight_context");
}

function highlightEntry(element) {
    if (HighlightedEntry) {
        lowlightEntry(HighlightedEntry);
    }
    if (!element) {
        return;
    }
    Highlighted = element;
    element.classList.add("__dxt_highlight_context");
    focusEntry(element);
}

function sendMessageToPopup(message, data) {
    chrome.runtime.sendMessage(new Message(message, { id: Status.popupId, ...data }));
}

function sendStatusToPopup() {
    sendMessageToPopup(Message.Status, { status: Status });
}

function isEmpty(object) {
    return Object.entries(object).length === 0 && object.constructor === Object;
}

function getDOMPath(element) {
    let stack = [];
    while (element.parentNode != null) {
        let siblingCount = 0;
        let siblingIndex = 0;
        for (let i = 0; i < element.parentNode.childNodes.length; i++) {
            let sibling = element.parentNode.childNodes[i];
            if (sibling.nodeName == element.nodeName) {
                siblingCount++;
                if (sibling === element) {
                    siblingIndex = siblingCount;
                }
            }
        }
        if (element.hasAttribute("id") && element.id !== "") {
            stack.unshift(element.nodeName.toLowerCase() + "#" + element.id);
            break;
        } else if (siblingCount > 1) {
            stack.unshift(element.nodeName.toLowerCase() + ":nth-of-type(" + siblingIndex + ")");
        } else {
            stack.unshift(element.nodeName.toLowerCase());
        }
        element = element.parentNode;
    }
    return stack.join(">");
}

function extract() {
    let ner = new NER();
    let tx = new TextWithContextExtractor();
    let textNodesWithContext = tx.extract();
    Status.amountOfEntries = textNodesWithContext.size;
    Status.fetchedEntries = [];
    sendStatusToPopup();
    let toProcess = [];
    for (let textNode of textNodesWithContext) {
        toProcess.push(() => {
            let entries = ner.parse(textNode.textContent);
            for (let entity of entries) {
                textNode.highlight(entity);
            }
            let fetchedEntry = { entries: entries, context: textNode.textContent, path: getDOMPath(textNode.node) };
            Status.fetchedEntries.push(fetchedEntry);
            sendMessageToPopup(Message.EntityFetched, fetchedEntry);
        });
    }
    let process = () => {
        setTimeout(() => {
            if (toProcess.length) {
                toProcess.shift()();
                process();
            } else {
                Status.status = STATUS.EXTRACTED;
                sendStatusToPopup();
            }
        }, 0);
    };
    process();
}

window.addEventListener("load", (e) => {
    chrome.runtime.sendMessage(new Message(Message.Activate));
});

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
        case Message.Highlight:
            highlightEntry(document.querySelector(request.data.path));
            break;
        case Message.Lowlight:
            lowlightEntry(document.querySelector(request.data.path));
            break;
    }
});
