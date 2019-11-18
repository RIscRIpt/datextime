class Message {
    constructor (type, data) {
        this.type = type;
        this.data = data;
    }
}

Message.GetStatus = "get_status";
Message.Extract = "extract";
