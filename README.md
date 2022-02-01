# missiondb

## Briefly
Database for medical mission work. Intentionally simple. Multiuser but phone/laptop based and robust in disconnected environments.

## Inspiration
Dr. Gennadiy Fuzaylov, a pediatric anesthesiologist at Massachusetts General Hospital and veteran of over 60 medical missions to the Ukraine, Columbia and found keeping track of patients, procedures and results was increasingly difficult. 
![[Doctors Collaborating To Help Children](http://dcthc.org)](images/dctohc.png)

A spreadsheet was not adequate -- poor phone interface, poor support for images, poorly multiuser and problematic security. Hence this project was born.

## Scope
### In scope
- Patient name, problem, image and demographics
- Medical procedures with description, data, images, taylored checklists
- Providers with contact information
- Followup
- Workflow support including patient ID cards, handheld data entry
- Schedule ?

### Out of scope
- lab values 
- vital signs
- drug and supply information
- Free text fields available for extra information

## Design
* Written by Paul Alfille MD, at Massachusetts General Hospital in 2021
* [Pouchdb](https://pouchdb.com/) is front end for device interaction (Javascript on browsers)
* [Couchdb](https://couchdb.apache.org/) backend for document dabase
  * Tolerant of poorly connected operation
  * Document based with tag fields
  * Excellent replication support to allow redundancy and remote access
* Consider IBMs [Cloudant](https://www.ibm.com/cloud/cloudant) for cloud storage with a free account for small projects
* All components are open source, as is this project

## Schema (preliminary)
* Mission
  * Location/Name
  * Year
  * Start date
  * End date
* Provider
  * Name
  * Contact info
  * Picture
* Trip
  * Link to Mission
  * Link to Provider
  * Notes / Images
  * Travel data
* Schedule
  * Link to Mission
  * Date
  * OR
  * Time
  * Link to patient
  * Link to provider(s)
* Patient
  * Name
  * Contact info
  * Link to Mission(s)
  * Operation
  * Operative Data
  * Preop data
  * postop data
  * pictures
  
So there is a light relational database on top of the data

# Usage
* Initial login.  Choose User Name 
![Login screen](images/mdb-Login.png)
* Main Menu.  Patient List is most common choice 
![Patient list](images/mdb-MainMenu.png)
* Patient List.  List of known patients 
![Patient list](images/mdb-PatientList.png)
* Patient List.  Select a patient 
![Patient menu](images/mdb-PatientListSelect.png)
* Patient is selected. Menu for this patient 
![Demographics](images/mdb-PatientPhoto.png)
* Demographics for this patient. How to edit 
![Demographics](images/mdb-PatientDemographics1.png)
* Demographics for this patient. How to save changes 
![Medical](images/mdb-PatientDemographics2.png)
* Medical Information and Operations  This is the main data entry screen for planning and recording operations
* Notes List Controls
![Note](images/mdb-NoteList.png)
* Notes List Start editting
![Note](images/mdb-NoteList2.png)
* Notes List Text entry field
![Note](images/mdb-NoteList3.png)
* Notes List Edit picture
![Note](images/mdb-NoteList4.png)
* Notes List Save or cancel changes
![Note](images/mdb-NoteList5.png)
* Notes List Edit the date and time
![Note](images/mdb-NoteList6.png)
* Notes List How to delete a note
![Note](images/mdb-NoteList7.png)
* Notes List Add a new note
![Note](images/mdb-NewNote.png)
* Notes List Add a new photo
![Note](images/mdb-NewPhoto.png)

# Schema as implemented
* Patient record

|key|name|type|note|
|:-|:-|:-|:-|
|_id|Patient Id|automatic|p;0;Last;First;DOB "p",version,...|
|author|user name|automatic|username of record creator|
|type|record type|automatic|"patient"|
|LastName|Last name|text|required|
|FirstName|First Name|text|required|
|DOB|Date of Birth|YYYY-MM-DD|required|
|email|e-mail address|email format|in Demographics|
|phone|phone number|phone format|in Demographics|
|Address|address |free text|in Demographics|
|Contact|contact info|free text|in Demographics|
|Dx|Diagnosis| free text|in Medical|
|Sex|Sex| multiple choice|in Medical|
|Weight|Patient weight (kg)|number|in Medical|
|Height|Patient height (cm)|number|in Medical|
|ASA|ASA class|multiple choice|in Medical|
|Allergies|Allergies|free text|in Medical|
|Meds|Medications|free text|in Medical|
|_attachments:image:data|Image|automatic|binary image data|
|_attachments:image:content_type|Image type|automatic|e.g. png||

* Operation record

|key|name|type|note|
|:-|:-|:-|:-|
|_id|Operation Id|automatic|o;0;Last;First;DOB;timestamp modified patient_id + creation timestamp |
|author|user name|automatic|username of record creator|
|type|record type|automatic|"operation"|
|patient_id|Patient Id|automatic|link back to patient|
|Complaint|Patient presenting complaint|free text|in Medical|
|Procedure|Type of operation|text||
|Surgeon|Surgeon|text||
|Equipment|Needed equipment|free text||
|Status|Scheduling status|multiple choice||
|Date-Time|Time of operation|date time|if known|
|Duration|Expected length (hours)|number|without turnover|
|Laterality|Left / Right|multiple choice||

* Note Record

|key|name|type|note|
|:-|:-|:-|:-|
|_id|Operation Id|automatic|c;0;Last;First;DOB;timestamp modified patient_id + creation timestamp |
|author|user name|automatic|username of record creator|
|type|record type|automatic|"note"|
|patient_id|Patient Id|automatic|link back to patient|
|text|Note text|free text||
|date|Date|YYY-MM-DD|automatic and editable|
|_attachments:image:data|Image|automatic|binary image data|
|_attachments:image:content_type|Image type|automatic|e.g. png||

* Local record (does not replicate to other places)

|key|name|type|note|
|:-|:-|:-|:-|
|_id|_local/username|automatic|in MainMenu -> Settings |
|username|user name|text|your user name|
|remoteCouch|Remote database|list +|link to remote replication databases|
|displayState|internal state|automatic|resume place in program|
|patientId|Patient Id|automatic|Last patient selected|
|noteId|Note Id|automatic|Last note selected|
|operationId|Operation Id|automatic|Last operation selected|



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

  

