# Firewall

We will use a firewall to protect our server.

Ports to allow:

* ssh secure shell access: port=22
* web server:
  * regular port=80
  * secure port=443
* couchdb database
  * regular port=5984
  * secure port=6984
  

Eventually we will close 5984 and redirect web traffic to secure.

Log into the server console as root via ssh and your __*server_password*__

`ssh root@domain_name`

using your actual __*domain_name*__

```
apt update
apt upgrade
# install firewall
apt install ufw
# open ports
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5984/tcp
ufw allow 6984/tcp
# start and test
ufw enable
ufw status
```

