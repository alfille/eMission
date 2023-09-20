# Record IDs

A Coudb/Pouchdb database is structured as a collection of documents organized by a *document id*. [Best practice](https://pouchdb.com/2014/06/17/12-pro-tips-for-better-code-with-pouchdb.html) is to use the document id creatively.

**eMission** uses the following scheme for document ids:

|Type|Version|Last|First|DOB|DATE|
|--|--|--|--|--|--|
|char|0|lastname|firstname|date-of-birth|ISO create date-time|

Each field is separated by a "**;**"

|Type|description|notes|
|--|--|--|
|p|Patient|no DATE e.g. *p;0;Doe;John;2000-01-01*|
|m|Mission|no DATE e.g. *m;0;;;;*|
|o|Operation|e.g. *o;0;Doe;John;2000-01-01;2021-12-29T21:16:39.648Z;*|
|c|Note|e.g. *c;0;Doe;John;2000-01-01;2021-12-19T21:19:39.658Z;*|

Observe that all notes and operations contain the patient's id in their id -- as well as a field called *patient_id* to help with that link.

The ID scheme also allows retrieving all operations, notes for either a patient or all patients directly.

If a patient is later found to have two different IDs, it is possible to merge with an option in the [Administration](Admininstration.html) menu. 