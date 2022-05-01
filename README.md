# eMission

## Briefly
eMission is a database for medical mission work. Intentionally simple. Supports your entire team using their smartphone, ipad or laptop. eMission is robust even when internet connectivity is spotty.

----------------------

## Inspiration
Dr. Gennadiy Fuzaylov, a pediatric anesthesiologist at Massachusetts General Hospital and veteran of over 60 medical missions to the Ukraine and  Columbia and found keeping track of patients, procedures and results was increasingly difficult. 

![[Doctors Collaborating To Help Children](http://dcthc.org)](images/dctohc.png)

He needed a way to:

* collaborate with the rest of the mission team
* keep track of patients, cases and equipment
* keep a visual record of the injuries and document followup


A spreadsheet was not adequate -- poor phone interface, poor support for images, poorly multi-user and problematic security. Hence this project was born.

------------------------------

## Scope (i.e. what eMission does)

- Patient name, problem, image and demographics
- Medical procedures with description, data, images, tailored checklists
- Providers with contact information
- Followup
- Workflow support including patient ID cards, downloadable data
- Supports phones, tablets and laptops

### Out of scope
- lab values 
- vital signs / monitoring
- drug and supply information
- But free text fields are available for extra information

----------------

## Design
* Written by Paul Alfille MD at Massachusetts General Hospital in 2021
* __Non-technical__
  * Runs entirely in a web browser (like Chrome, Safari, Edge)
  * Connects and shares data whenever the internet is available
  * Installed just be clicking a web link
  * Password protected and encrypted communication
  * Free to use and modify
  * Open Source
* __Technical__
  * Hosted on [Github](https://github.com/alfille/emission)
  * Document database: [Pouchdb](https://pouchdb.com/) for users and [Couchdb](https://couchdb.apache.org/) backend
  * Pure Javascript with no dependencies
  * Included javascript libraries are open source as well

# Start up / installation

![](images/printUser.png)

Typically the user with get an invitaion by email. text or hard copy. It will include a web link with all the information needed to install and register your name/password included

More information on starting.

# Usage
* Initial login. 
Choose User Name 
![Login screen](images/mdb-Login.png)
* Main Menu. 
Patient List is most common choice 
![Patient list](images/mdb-MainMenu.png)
* Patient List. 
List of known patients 
![Patient list](images/mdb-PatientList.png)
* Patient List. 
Select a patient 
![Patient menu](images/mdb-PatientListSelect.png)
* Patient is selected. Menu for this patient 
![Demographics](images/mdb-PatientPhoto.png)
* Demographics for this patient. How to edit 
![Demographics](images/mdb-PatientDemographics1.png)
* Demographics for this patient. How to save changes 
![Medical](images/mdb-PatientDemographics2.png)
* Medical Information and Operations 
This is the main data entry screen for planning and recording operations
* Notes List
Controls
![Note](images/mdb-NoteList.png)
* Notes List
Start editting
![Note](images/mdb-NoteList2.png)
* Notes List
Text entry field
![Note](images/mdb-NoteList3.png)
* Notes List
Edit picture
![Note](images/mdb-NoteList4.png)
* Notes List
Save or cancel changes
![Note](images/mdb-NoteList5.png)
* Notes List
Edit the date and time
![Note](images/mdb-NoteList6.png)
* Notes List
How to delete a note
![Note](images/mdb-NoteList7.png)
* Notes List
Add a new note
![Note](images/mdb-NewNote.png)
* Notes List
Add a new photo
![Note](images/mdb-NewPhoto.png)


# [Database Design](/help/Schema.md)


# Installation
* Instructions from [pouchdb](https://pouchdb.com/guides/setup-couchdb.html):
```
#install couchdb
sudo apt install couchdb

#start couchdb
sudo systemctl start couchdb

#test
curl localhost:598

# add [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
sudo npm install -g add-cors-to-couchdb
add-cors-to-couchdb

# PouchDB
sudo npm install --save pouchdb-browser

```

  

