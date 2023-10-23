# General design

## Programs
|Function |Program|Packaging |
|---|---|---|
|operating system|Debian 12|From [VPS provider](provisioning.html)|
|console access|ssh|Built into operating system|
|  |  |user: root|
|  |  |password:[__*server_password*__](essential_info.html)|
|Firewall|ufw|apt|
|Packaging|snap|apt|
|Documentation|mdbook|snap|
|Application|eMission|git|
|Web server|caddy|apt|
|Database|couchdb|snap|

## Arrangement
![](images/server_struct1.png)

