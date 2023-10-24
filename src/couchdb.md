# Couchdb Database

There are several ways to install couchdb on your server, but the clearest and easiest is via *snap*s. Our reference is this [2023 Cyrus Brett article](https://techviewleo.com/how-to-install-apache-couchdb-in-debian/?expand_article=1). 

### Password

You will need your couchdb administrator [__*database_password*__](essential_info.html)

couchdb administration:

* username: admin
* password: your __*database_password*__

### Prerequisite

If you have been performing the server setup sequentially, [*snap*](snap.html) will already have been installed. 


### Install software


```
# Set snapd to start automatically
systemctl enable --now snapd.socket
systemctl status snapd
# install snap components
snap install couchdb
```

Now we will change the configuration file
```
nano /var/snap/couchdb/current/etc/local.ini
```

and change the 3 lines:

```
[chttpd]
;port = 5984
;bind_address = 127.0.0.1
```

to

```
[chttpd]
port = 15984
bind_address = 127.0.0.1
```

Note that we've changed the port from the default 5984 to 15984 to make reverse proxy easier.

### Basic setup and start of couchdb

```
snap set couchdb admin=database_password
snap connect couchdb:mount-observe
snap connect couchdb:process-control
snap start couchdb
```

where you substitute your real *database_password*

### Test installation

Input:
```
wget localhost:15984 -O-
```

Output:
```
Resolving localhost (localhost)... 127.0.0.1
Connecting to localhost (localhost)|127.0.0.1|:15984... connected.
HTTP request sent, awaiting response... 200 OK
Length: 247 [application/json]
Saving to: ‘STDOUT’

-                                0%[                                                     ]       0  --.-KB/s               {"couchdb":"Welcome","version":"3.1.1","git_sha":"ce596c65d","uuid":"27448ab2956df57e98f006406bd8da31","features":["access-ready","partitioned","pluggable-storage-engines","reshard","scheduler"],"vendor":{"name":"The Apache Software Foundation"}}
-                              100%[====================================================>]     247  --.-KB/s    in 0s      

2023-10-24 13:09:54 (32.5 MB/s) - written to stdout [247/247]
```

### Current Status

We now have *CouchDB* running, but we can't access it until we set up our web server.