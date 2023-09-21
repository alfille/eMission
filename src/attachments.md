# Pictures and Attachments

**eMission** stores images directly in documents as *binary attachments*.

For example

```
{
  "_id": "c;0;Baggins;Bilbo;2022-03-17;2023-05-16T08:58:28.425Z",
  "_rev": "2-5fdbbdc5bcd638163fd1a58d35f50794",
  "text": "Mithril tunic",
  "title": "",
  "author": "Hobbit",
  "type": "note",
  "category": "Uncategorized",
  "patient_id": "p;0;Baggins;Bilbo;2022-03-17",
  "date": "2023-05-16T08:58:28.425Z",
  "_attachments": {
    "image": {
      "content_type": "image/jpeg",
      "revpos": 2,
      "digest": "md5-7jdbRxa6NBVhgIYZZqlDag==",
      "length": 6396,
      "stub": true
    }
  }
}
```

Under *_attachments* an entry of *image* is placed.

* Only images are currently supported
* Only one image per record
* Not all records will have an attachment

|Type|Attachments|
|--|--|
|Note|yes|
|Patient|yes|
|Mission|yes|
|Operation|no|
