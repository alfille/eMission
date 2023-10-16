# Build your own server

This section documents the actual steps for setting up your own **eMission** server. As We assume considerable server management experience.

There are simpler ways to [set up a mission](NewMission.html). Specifically [using existing infrastructure](OurServer.html).

## Basic Structure

![](images/server_struct.png)

At the most basic level, implementing a *web server*, and a *database* that follows [couchdb protocol](https://docs.couchdb.org/en/stable/replication/protocol.html) is sufficient. Even the Instructions can be served from the [original site](https://emissionsystem.org/book/index.html) with appropriate *server redirect*.

## Implemented Structure

![](images/server_struct2.png)

For better maintainability and security, the actual implementation includes: 

* Firewall
	* filters http access to couchdb
	* could substitute *reverse proxy* in web server instead
* git
  * easy update of code and markdown documentation
* mdbook
  * build html from markdown
  
## Platform	

**eMission** developement and server implementation has been on **Linux** (a very common server platform). The following instructions will assume linux.

There is no reason why a **Windows** server could not be used for **eMission** server deployment. All the components have windows versions. There will be differences in the file structure, service initiation, and software packaging.

If you do build on Windows, please share your experience.

