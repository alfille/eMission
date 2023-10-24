# Firewall

We will use a firewall to protect our server.

Ports to allow:

* ssh secure shell access: port=22
* web server:
  * regular port=80
  * secure port=443
* couchdb database
  * port=5984 
  * secure port=6984
  * Both will be secured via reverse proxy by web server
  

### Setup

If you have followed the setup sequentially, *ufw* should already be installed. Otherwise use the steps in [initial setup](initial_server.html) to access the server and install *ufw*

### Configure and start

```
# open ports
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5984/tcp
ufw allow 6984/tcp
# start and test
ufw enable
```

### Test
Input:
```
ufw status
```

Output:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere                  
80/tcp                     ALLOW       Anywhere                  
443/tcp                    ALLOW       Anywhere                  
5984/tcp                   ALLOW       Anywhere                  
6984/tcp                   ALLOW       Anywhere                  
22/tcp (v6)                ALLOW       Anywhere (v6)             
80/tcp (v6)                ALLOW       Anywhere (v6)             
443/tcp (v6)               ALLOW       Anywhere (v6)             
5984/tcp (v6)              ALLOW       Anywhere (v6)             
6984/tcp (v6)              ALLOW       Anywhere (v6)             
```