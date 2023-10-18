# eMission Code

**eMission** will be served from the `/srv/www/` directory -- this is the actual application code and instructions.

### Initial setup

We will clone the **eMission** repository into `/srv/www` and later update by pulling changes into that directory.

Note that you can fork the eMission repository, make changes, and use that repository instead.

```
# Get "git"
apt install git
# Clear out any existing web content
rm -rf /srv/www
# Pull in code
git clone https://github.com/alfille/eMission /srv/www
```

### Rebuild instructions

You will also need to run [`mdbook`](mdbook.html) to translate the instructions into HTML

```
# Go to website directory
cd /srv/www
# Build HTML structure from Markdown
mdbook build
```

### Update eMission (later)

```
# Go to website directory
cd /srv/www
# Pull in updated version
git pull
# Rebuild HTML structure from Markdown
mdbook build
```

