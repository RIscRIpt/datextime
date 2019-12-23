class Message {
    constructor (type, data) {
        this.type = type;
        this.data = data;
    }
}

Message.Activate = "activate";
Message.Status = "status";
Message.GetStatus = "get_status";
Message.Extract = "extract";
Message.EntityFetched = "entity_fetched";
Message.Highlight = "highlight";
Message.Lowlight = "lowlight";
