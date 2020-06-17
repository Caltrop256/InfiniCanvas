"use strict";
const Cloudflare = require('cloudflare')

module.exports = class CloudCleaner {
    constructor(token) {
        this.module = "acme-dns-01-cloudflare";
        this.verbose = true;
        this.verifyPropagation = true;
        this.token = token;
        this.client = new Cloudflare({
            token: token
        });
    }
    async getZone(hostname) {
        let { result } = await this.client.zones.browse();
        return result.find(x => x.name === hostname).id;
    }
    async getTxtRecords(zoneID) {
        let result = await this.client.dnsRecords.browse(zoneID, { type: 'TXT' });
        return result.result.filter(x => ((x.name.startsWith('_acme-challenge') || x.name.startsWith('_greenlock-dryrun')) && x.ttl == 120));
    }
    async clearTxtRecords(hostname) {
        let zoneID = await this.getZone(hostname);
        let records = (await this.getTxtRecords(zoneID));
        for (let record of records) {
            await this.client.dnsRecords.del(zoneID, record.id);
            console.log(`Deleting Record ${record.name} (${record.id})`);
        }
    }
}