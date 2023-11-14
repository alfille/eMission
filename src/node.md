# Node.js

Within __eMission__ there is an option to [switch mission](DBTable.md) to let the user choose which mission they are using at the moment. They will still need to have permission to use that database [granted by the administrator](MissionMembers.md).

We will build a database of mission files using a separate program that runs periodically.

### Design

* Program *databases.js* is Javascript, but runs on the server outside of a browser (unlike the rest of the javascript programs that run is a web browser on the client)
* module [*nano.js*](https://github.com/apache/couchdb-nano) is a couchdb-supported javascript interface to Couchdb to allow pulling mission record information.
* [*node.js*](https://nodejs.org/en/) is a Javascript Runtime environment -- providing many of the services for Javascript usually provided by a browser.
* *databases* is the couchdb database created to house the mission list. It has a recod for each mission with data from the mission record to make it easy to identify and switch missions
* Configuration is in a JSON file (default /etc/eMission.json) that holds the domain name, ports, and couchdb admin password.
* Updating is controlled by the operating system. We use a [systemd](https://systemd.io/) service triggered by:
  * time (every 30 minutes)
  * file change (in the couchdb data folder)

### Files

name|description|location|preparation
---|---|---|---
databases.js|program to update `databases`|js/|none
nano.js|javascript couchdb support|js/|none
eMission.service|systemd unit to run databases.js|systemd/|copy to /etc/systemd/system
eMission.timer|systemd run every 30 minutes|systemd/|copy to /etc/systemd/system
eMission.path|systemd run on couchdb data change|systemd/|copy to /etc/systemd/system
eMission.json|configuration file|systemd|edit and copy to /etc

## Install

### Install Node.js

```
apt install -y nodejs
```

### copy files
```
cp /srv/www/systemd/eMission.service /etc/systemd/system
cp /srv/www/systemd/eMission.timer /etc/systemd/system
cp /srv/www/systemd/eMission.path /etc/systemd/system
cp /srv/www/systemd/eMission.json /etc
```

## Configure

Edit the configuration file to add your domain and password

```
nano /etc/eMission/json
```

The file originally looks like this:
```
{
    "local": "http://127.0.0.1:15984",
    "remote":"https://eMissionsystem.org:6984",
    "password":"database_password",
    "username":"admin"
}
```

Typically you will need to change the "remote" and "password" entries.

## Start

```
systemctl enable eMission.timer
systemctl enable eMission.path
```

__________

### test

* node

```
node --version
```

* databases.js

```
node /srv/www/js/databases.js
```

* systemd services

```
systemctl list-timers --all
