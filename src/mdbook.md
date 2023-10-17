# MDBook Documentation Server

### Background

**mdbook** is a documentation system, written for the rust language, that makes creating a website easy. 

* Content is is markdown format -- an easy wiki-style text with formatting
* Navigation structure is specified in the `SUMMARY.md` file
* Markdown files are in the `src` subdirectory
* Images are in the `images` subdirectory of `src`
* `mdbook build` translates content to html in the `book` subdirectory

### Installation

Since we will use *snap* packaging for couchdb, we'll use it for [mdbook](https://snapcraft.io/install/mdbook/debian) as well

```
apt update
apt upgrade
apt install snapd
snap install code
snap install mdbook
```