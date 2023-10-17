# eMission Code

**eMission** will be served from the `/srv/www/` directory -- this is the actual application code and instructions.

### Initial setup

We will clone the **eMission** repository into that directory and later update by pulling changes into that directory.

Note that you can fork the eMission repository, make changes, and use that repository instead.

```
# Clear out any existing web content
rm -rf /srv/www
# clone in code
git clone https://github.com/alfille/eMission /srv/www
```

### Rebuild instructions

The only other suggested step is to run `mdbook`

```
cd /srv/www
mdbook build
```

### Update eMission (later)

```
cd /srv/www
git pull
mdbook build
```

