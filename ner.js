class NER {
    constructor () {
        this.dateTimeRecognizer = new microsoftRecognizersTextDateTime.DateTimeRecognizer(microsoftRecognizersText.Culture.English);
        this.dateTimeModel = this.dateTimeRecognizer.getDateTimeModel();
    }

    parse(query, referenceDate) {
        try {
            let results = this.dateTimeModel.parse(query, referenceDate);
            return results.filter(entity => {
                if (query.substring(entity.start, entity.end + 1) === "may") {
                    return false;
                }
                return true;
            });
        } catch (error) {
            return [];
        }
    }
}
