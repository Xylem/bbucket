# Setup

Create `~/.bbrc` file in the following format
```
username=<Bitbucket username>
password=<Bitbucket password>
team=<team's username>
projectKey=<project key>
approveThreshold=<number of approves for PR to be considered 'ready', default = 2>
```

# Installing

Install with `npm i -g bbucket`, run with `bb`.

# Commands

* `pr` - lists unapproved pull request
  * `-a, --all` - lists all pull requests instead