# MDBook Documentation Server

### Background

[**mdbook**](https://rust-lang.github.io/mdBook/) is a documentation system, written for the rust language, that makes creating an instructional website easy. 

* Content is is markdown format -- an easy wiki-style text with formatting
* Navigation structure is specified in the `SUMMARY.md` file
* Markdown files are in the `src` subdirectory
* Images are in the `images` subdirectory of `src`
* `mdbook build` translates content to html in the `book` subdirectory



### Installation

#### Future state, using snap when updated

__The snap version of mdbook (v0.0.28) doesn not support the features we use, so use direct binaries__

If you have been following the setup steps sequentially [snap](snap.html) should have been install already.

```
snap install mdbook
```

#### Current state, using direct binary importqqq

```
wget -c https://github.com/rust-lang/mdBook/releases/download/v0.4.35/mdbook-v0.4.35-x86_64-unknown-linux-musl.tar.gz -O - | tar -xz
mv mdbook /usr/bin
```

## Usage

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

### Test

Input:
```
mdbook --version
```
Output:
```
mdbook v0.4.35
```

