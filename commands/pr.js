'use strict';

const colors = require('colors/safe');
const Table = require('cli-table');
const config = require('rc')('bb');
const request = require('request-promise').defaults({
    auth: {
        username: config.username,
        password: config.password
    },
    json: true
});

const URL = 'https://api.bitbucket.org/2.0';

function strictParseInt(value) {
    if (/^(\-|\+)?([0-9]+|Infinity)$/.test(value)) {
        return Number(value);
    }

    return NaN;
}

const fetchAll = url => request(url)
    .then(data => data.next ? fetchAll(data.next).then(next => data.values.concat(next)) : data.values);

function sortByApproves(order = 'asc') {
    return (a, b) => {
        let approveSort = a.approves.length - b.approves.length;

        approveSort *= order === 'asc' ? 1 : -1;

        if (approveSort !== 0) {
            return approveSort;
        }

        return a.title.localeCompare(b.title);
    }
}

function colorRow(row, color, enableColor) {
    if (enableColor) {
        return row.map(value => colors[color](value));
    }

    return row;
}

module.exports = options => {
    let approveThreshold = strictParseInt(config.approveThreshold);

    if (!Number.isInteger(approveThreshold)) {
        console.warn('Approve threshold not set, assuming 2');
        approveThreshold = 2;
    }

    request(URL + '/user').then(me => {
        fetchAll(URL + `/repositories/${config.team}`)
            .then(data => data.filter(repo => repo.project.key === config.projectKey))
            .map(repo => fetchAll(repo.links.pullrequests.href))
            .reduce((all, prs) => all.concat(prs), [])
            .map(pr => fetchAll(pr.links.activity.href).then(data => {
                pr.approves = data.filter(activity => activity.approval).map(activity => activity.approval.user);
                return pr;
            }))
            .then(data => data.reduce((prs, pr) => {
                prs[pr.author.username === me.username ? 'mine' : 'other'].push(pr);

                return prs;
            }, {
                mine: [],
                other: []
            }))
            .then(data => {
                if (options.all){
                    data.other = data.other.filter(pr => !pr.approves.some(user => user.username === me.username))
                }

                return data;
            })
            .then(data => {
                data.mine.sort(sortByApproves('desc'));
                data.other.sort(sortByApproves());
                return data;
            })
            .then(data => {
                data.mine.forEach(pr => {
                    pr.status = pr.approves.length >= approveThreshold ? '✓' : '✗';
                });

                data.other.forEach(pr => {
                    pr.status = pr.approves.length < approveThreshold ? '✓' : '✗';
                });

                return data;
            })
            .then(data => {
                const mineTable = new Table({
                    head: ['PR name', 'Link', 'Approve count', 'Ready to merge?']
                });
                const otherTable = new Table({
                    head: ['PR name', 'Link', 'Approve count', 'Should I bother?']
                });

                mineTable.push(...data.mine.map(pr => colorRow([ pr.title, pr.links.html.href, pr.approves.length, pr.status ], 'green', pr.status === '✓')));
                otherTable.push(...data.other.map(pr => colorRow([ pr.title, pr.links.html.href, pr.approves.length, pr.status ], 'grey', pr.status === '✗')));

                console.log('My PRs');
                console.log(mineTable.toString());
                console.log('\nOthers\' PRs');
                console.log(otherTable.toString());
            });
    });
};
