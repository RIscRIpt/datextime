function entriesOverlap(e1, e2) {
    return e1.start <= e2.end && e2.start <= e1.end;
}

class NER {
    constructor () {
        this.dateTimeRecognizer = new microsoftRecognizersTextDateTime.DateTimeRecognizer(microsoftRecognizersText.Culture.English);
        this.sequenceRecognizer = new microsoftRecognizersTextSequence.SequenceRecognizer(microsoftRecognizersText.Culture.English);

        this.dateTimeModel = this.dateTimeRecognizer.getDateTimeModel();
        this.ipModel = this.sequenceRecognizer.getIpAddressModel();
        this.phoneModel = this.sequenceRecognizer.getPhoneNumberModel();
    }

    filterEntry(query, entry) {
        if (query.substring(entry.start, entry.end + 1) === "may") {
            return false;
        }

        let phones = this.phoneModel.parse(query);
        for (let phone of phones) {
            if (phone.resolution.score < 0.5) {
                continue;
            }
            if (entriesOverlap(entry, phone)) {
                return false;
            }
        }

        let ips = this.ipModel.parse(query);
        for (let ip of ips) {
            if (ip.resolution.score < 0.5) {
                continue;
            }
            if (entriesOverlap(entry, ip)) {
                return false;
            }
        }

        return true;
    }

    parse(query, referenceDate) {
        try {
            let results = this.dateTimeModel.parse(query, referenceDate);
            return results.filter(entry => this.filterEntry(query, entry));
        } catch (error) {
            return [];
        }
    }
}
