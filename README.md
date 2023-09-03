# eMission

## Briefly
eMission is a database for medical mission work. Intentionally simple. Supports your entire team using their smartphone, ipad or laptop. eMission is robust even when internet connectivity is spotty.

----------------------

## Inspiration
Dr. Gennadiy Fuzaylov, a pediatric anesthesiologist at Massachusetts General Hospital and veteran of over 60 medical missions to the Ukraine and  Columbia and found keeping track of patients, procedures and results was increasingly difficult. 

![[Doctors Collaborating To Help Children](https://dcthc.org)](src/images/dctohc.png)

He needed a way to:

* collaborate with the rest of the mission team
* keep track of patients, cases and equipment
* keep a visual record of the injuries and document followup


A spreadsheet was not adequate -- he wanted to use his phone, include pictures, and be more secure. Hence the __eMission__ project was born.

------------------------------
![](src/images/gman.jpg)

- [ ] ## Scope (i.e. what eMission does)

- Keeps track of patients, problems, images and demographics
- Records operative procedures with description, data, images, tailored checklists
- Documents outcomes and followup
- Supports a workflow that includes patient ID cards and downloadable data
- Usable on phones, tablets and laptops

### Out of scope
- lab values 
- vital signs / monitoring
- drug and supply information

Note that *free text fields* are available for extra information

----------------

## Design
* Runs entirely in a web browser (like Chrome, Safari, Edge)
* Connects and shares data whenever the internet is available
* Installed just by clicking a web link
* Password protected and encrypted communication
* Free to use and modify
* Open Source

# Test it out now

There is a test database available for use

* No real patient information
* Based on J.R.R.Tolkien's *Lord of the Rings*
* User: Hobbit
* Password: TheShire
* Address: https://emissionsystem.org:6984
* Database: testdb
* Direct Link: https://emissionsystem.org/?address=https%3A%2F%2Femissionsystem.org%3A6984&database=testdb&password=TheShire&username=Hobbit
* QR code (scan with your phone camera)

![test database line](/src/images/qr.png)

Or just go to [https://emissionsystem.org](https://emissionsystem.org)

![](book/images/bean.jpg)


[eMission Manual](https://emissionsystem.org/book/index.html)

# Advanced information 

This section is for administrators and developers

  * Pure Javascript with no dependencies
  * Included javascript libraries are open source as well
* License: [MIT](https://mit-license.org) (OpenSource)
*  Copyright 2021-2022 Paul H Alfille MD palfille@mgh.harvard.edu
