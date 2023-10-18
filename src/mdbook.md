# MDBook Documentation Server

### Background

[**mdbook**](https://rust-lang.github.io/mdBook/) is a documentation system, written for the rust language, that makes creating an instructional website easy. 

* Content is is markdown format -- an easy wiki-style text with formatting
* Navigation structure is specified in the `SUMMARY.md` file
* Markdown files are in the `src` subdirectory
* Images are in the `images` subdirectory of `src`
* `mdbook build` translates content to html in the `book` subdirectory

### Installation

Since we will use *snap* packaging for couchdb, we'll use it for [mdbook](https://snapcraft.io/install/mdbook/debian) as well

```
# Standard updating
apt update
apt upgrade
# Install snap (if not already there)
apt install snapd
snap install core
# Install mdbook itself
snap install mdbook
```

If this is the first time you've install *snapd* you will need to log out and back in to realize the changes the installation did for your *PATH*.

### Usage

Use **mdbook** every time you update the code or documentation in the [github repository](https://github.com/alfille/eMission). If you've "forked" the repository to customize, use that repository version instead.

Obviously this is after you've done the initial [directory creation and code pull](emission_code.html).
```
# go to web directory
cd /srv/www
# pull in changes
git pull
# rebuild HTML structure from Markdown
mdbook build
```