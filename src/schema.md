# Database Record format

* PouchDB (on the device) and CouchDB on the server are a non-SQL record-based key-value database. 
* All records have a 
  * unique key (ID)
  * housekeeping fields for version control and replication
  * Application assigned key:value pairs

eMission design used the [unique Id](ids.html) as follows:

* Type (Patient,Operation,Mission,Note)
* Version
* unique Patient identifier
* Date
* This allows a patient's records to be grouped together

## Patient record

|key|name|type|note|
|:-|:-|:-|:-|
|_id|Patient Id|automatic|p;0;Last;First;DOB "p",version,...|
|author|user name|automatic|username of record creator|
|patient_id|patientId|automatic|reference back to this (main patient) record|
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

## Operation record

|key|name|type|note|
|:-|:-|:-|:-|
|_id|Operation Id|automatic|o;0;Last;First;DOB;timestamp modified patient_id + creation timestamp |
|patient_id|patientId|automatic|reference back to this patient's main record|
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

## Note Record

|key|name|type|note|
|:-|:-|:-|:-|
|_id|Operation Id|automatic|c;0;Last;First;DOB;timestamp modified patient_id + creation timestamp |
|patient_id|patientId|automatic|reference back to patient's main record|
|author|user name|automatic|username of record creator|
|type|record type|automatic|"note"|
|patient_id|Patient Id|automatic|link back to patient|
|text|Note text|free text||
|date|Date|YYY-MM-DD|automatic and editable|
|_attachments:image:data|Image|automatic|binary image data|
|_attachments:image:content_type|Image type|automatic|e.g. png||

## Mission
|key|name|type|note|
|:-|:-|:-|:-|
|_id|MissionId|automatic|Unique single ID|
|patient_id|MissionId|automatic|reference back to this record|
|Organization|Sponsoring Organization|text|for attribution|
|Mission|This Journey|text|Name of this mission|
|link|Web link|URL|to the mission or organization|
|Location|Country and City|text|Place of mission|
|StartDate|Beginning|Date|of mission|
|EndDate|End|Date|of mission|
|Emergency|Emergency contact|free text|Who to contact -- i.e. local official|
|_attachments:image:data|Mission Logo|automatic|binary image data|
|_attachments:image:content_type|Mission logo|automatic|e.g. png||

# Patterns

* Mission record is similar to a patient record
  * ID has same number of fields
  * Mission Notes have a *patient_id* field that refers back to it
  * There is no analog to Lastname, Firstname or DOB in id
  * Only a single mission record per database is allowed
* Mission Notes are similar to patient notes
  * Same fields and editing
  * no real use of categories 