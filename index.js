#!/usr/bin/env node

'use strict';

const program = require('commander');
const table = require('text-table');
const config = require('rc')('bb');
const request = require('request-promise').defaults({
    auth: {
        username: config.username,
        password: config.password
    },
    json: true
});

const URL = 'https://api.bitbucket.org/2.0';

const fetchAll = url => request(url)
    .then(data => data.next ? fetchAll(data.next).then(next => data.values.concat(next)) : data.values);

program
    .version(require('./package').version);

program
    .command('pr')
    .option('-a, --all', 'list all pull requests instead')
    .description('list unapproved pull requests')
    .action(options => {
        request(URL + '/user').then(me => {
            fetchAll(URL + `/repositories/${config.team}`)
                .then(data => data.filter(repo => repo.project.key === config.projectKey))
                .map(repo => fetchAll(repo.links.pullrequests.href))
                .reduce((all, prs) => all.concat(prs), [])
                .map(pr => fetchAll(pr.links.activity.href).then(data => {
                    pr.approves = data.filter(activity => activity.approval).map(activity => activity.approval.user);
                    return pr;
                }))
                .then(data => options.all ? data : data.filter(pr => !pr.approves.some(user => user.username === me.username)))
                .then(data => console.log(table(data.map(pr => [ pr.title, pr.links.html.href ]))));
        });
    });

program.parse(process.argv);
