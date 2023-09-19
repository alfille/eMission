# Process start-up

*Low level details for developers*

* HTML page is loaded
  * index.html
  * admin.html
  * download.html
* Javascript programs (scripts) are loaded from the HTML page
  * support (like pouchdb, printJS, ...)
  * **eMission** program is loaded and started
* Startup tasks (index.html -> app.js)
  * Read URL parameters
    * credentials
    * patient id
    * Store in cookies and reload with clean URL
  * Get cookies
    * credentials (name/password/database/server)
    * patientId, operationId, noteId
    * navigation path
  * Check if in iframe (for **PatientMerge**)
  * Load/Create local database
  * start sync with remote database
  * check/create secondary indexes
  * create search database
  * Update some display elements with correct logo and links
  * Check if new database or new user needs **FirstTime** processing
  * Check and start navigation path 
* Startup tasks (download.html -> downapp.js)
  * No URL parsing
  * No search
  * no iframe
  * no queries
* Startup tasks (admin.html -> adminapp.js)
  * No URL parsing
  * No search
  * no iframe
 