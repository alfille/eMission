# Snap container management

[snap](https://snapcraft.io/docs/installing-snap-on-debian) is a "container" system that encapsulates and somewhat isolates a complex program. We will use it for 2 or our services:

* mdbook
* CouchDB

While it is certainly possible to build those programs from freely available source code, there are some complex dependencies that make the process rather tedious.

### Setup

If you have followed the setup sequentially, *snapd* should already be installed. Otherwise use the steps in [initial setup](initial_server.html) to access the server and install *snapd*

### Reset console

First, unlike other installation steps, *snap* needs you to log out and log back in to your server. (This is to make sure that your $PATH is set correctly so snap programs can be found).

### More setup

```
snap install core
```





 