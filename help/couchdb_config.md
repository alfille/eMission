# Configuring CouchDb

* Initial setup
* Set up super administrator
* Create database (or replicate from another source)
* Configure SSL
* Make exclusively SSL
  * Not directly supported as a configuration option
  * Work-around described by [Jonathan Hall](htgtps://jhall.io/posts/configuring-couchdb-https/) does not seem relevant to current versions.
  * Use the firewall ufw (on Ubuntu)
```
ufw show listening
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 6984
ufw deny 5984 ; non-SSL port -- will block
ufw enable
```
  * Output after firewall change:
```
# ufw show listening
tcp:
  16407 * (beam.smp)
  22 * (sshd)
   [ 1] allow 22/tcp

  4369 * (epmd)
  443 * (lighttpd)
   [ 3] allow 443

  5984 * (beam.smp)
   [ 5] deny 5984

  6984 * (beam.smp)
   [ 4] allow 6984

  80 * (lighttpd)
   [ 2] allow 80

tcp6:
  22 * (sshd)
   [ 6] allow 22/tcp

  4369 * (epmd)
udp:

```
  

 