# Couchdb Database

There are several ways to install couchdb on your server, but the clearest and easiest is via *snap*s. Our reference is this [2023 Cyrus Brett article](https://techviewleo.com/how-to-install-apache-couchdb-in-debian/?expand_article=1). 

### Password

You will need your couchdb administrator [__*database_password*__](essential_info.html)

couchdb administration:

* username: admin
* password: your __*database_password*__

### Install software

Get root access via ssh (or console access)

```
# upgrade software and install new programs
apt update
apt upgrade
apt install curl snapd
# You may need to leave and return for the path to be reset
# Set snapd to start automatically
systemctl enable --now snapd.socket
systemctl status snapd
# install snap components
snap install core
snap install couchdb
# Basic setup and start of couchdb
snap set couchdb admin=database_password
snap start couchdb
# some needed snap permissions 
snap connect couchdb:mount-observe
snap connect couchdb:process-control
# test couchdb
curl http://127.0.0.1:5984
```

### Edit configuration

The couchdb configuration file is at:

`/var/snap/couchdb/current/etc/local.ini`

The first pass edit should be, in the *chttpd* setion:
```
port = 5984
bind_address = 0.0.0.0
```

### Fauxton access
Point your web browser at:

http://yourdomain:5984/_utils/

Among other potential tasks, go to settings -> CORS -> enable

