# eMission Code

**eMission** will be served from the `/srv/www/` directory -- this is the actual application code and instructions.

### Setup

If you have followed the setup sequentially, *git* should already be installed. Otherwise use the steps in [initial setup](initial_server.html) to access the server and install *git*


### Initial setup

We will clone the **eMission** repository into `/srv/www` and later update by pulling changes into that directory.

Note that you can fork the eMission repository, make changes, and use that repository instead.

```
# Clear out any existing web content
cd /srv
rm -rf www
# Pull in code
git clone https://github.com/alfille/eMission www
```

### Initial Build and Update of eMission

For simplicity, we'll use the update code for the first time as well as all subsequent times:

```
# Go to website directory
cd /srv/www
# Pull in updated version
git pull
# Rebuild HTML structure from Markdown
mdbook build
```

