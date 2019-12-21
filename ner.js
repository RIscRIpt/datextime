class NER {
    constructor () {
        this.dateTimeRecognizer = new microsoftRecognizersTextDateTime.DateTimeRecognizer(microsoftRecognizersText.Culture.English);
        this.sequenceRecognizer = new microsoftRecognizersTextSequence.SequenceRecognizer(microsoftRecognizersText.Culture.English);

        this.dateTimeModel = this.dateTimeRecognizer.getDateTimeModel();
        this.ipModel = this.sequenceRecognizer.getIpAddressModel();
        this.phoneModel = this.sequenceRecognizer.getPhoneNumberModel();
    }

    parse(query, referenceDate) {
        return this.dateTimeModel.parse(query, referenceDate);
    }
}
