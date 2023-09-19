# Task split

*Optional information -- not required for use*

While the majority of the application is a single page, some tasks that take different libraries or different credentials are split out.

There are 3 HTML pages, each with it's own javascript. The CSS styles are universal.

| HTML | libraries | tasks |
|---|---|---|
|index.html|app.js|MainMenu|
||pouchdb|Patient entries|
||elasticlunr|Operation entries|
||qrenc|Note entries|
||printJS|Mission entries|
||flastpickr|Mission choose|
|||Error log|
|||Search|
|download.html|downapp.js|Download menu|
||pouchdb|JSON backup|
||pptxgenjs jszip|CSV|
|||Powerpoint|
|admin.html|adminapp.js|User management|
||pouchdb|Database console|
||qrenc|Database info|
||printJS|Merge patients|
||flatpickr|Enter credentials|

