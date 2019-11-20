class Message {
    constructor (type, data) {
        this.type = type;
        this.data = data;
    }
}

Message.Status = "status";
Message.GetStatus = "get_status";
Message.Extract = "extract";
Message.EntityFetched = "entity_fetched";
