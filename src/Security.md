# Security

## Summary
eMission is a distributed database with a central server component and a field-based handheld or laptop component. While the system is aimed at ease of use in poorly connected environments, there are moderate security safeguards on data.
## HIPPA
The [Health Information Privacy Protection Act](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html) is a U.S. statute that requires health information access be restricted and privacy maintained. eMission satisfies some of the components ( secure transmission, authentication ) but full HIPPA compliance is an broader organizational protocol that requires certain policies, record keeping and other aspects beyond the of scope of eMission.

## System components
### Central database
* Should be in a physically secure environment.
* Runs on a (typically) linux instance either on the cloud or a central office
* The root user should have separate access from the database administrator, and be managed by ssh (OpenSSH) secured console.
* The database, couchdb is password secured for administrative and user access.
* couchdb offers database-level rather than record level control.
* Database administrative access is by password protected SSL web console.
* Database transactions to the field are by SSL-secured communication.
* Database replication for backup to an off-site server is easy to set up.

### Communication
* All database and application communication is over https (SSL-secured) protocol.

### Remote access
#### Setup
* Initial setup, including credentials are transferred as a URL.
* Modes of transmission include e-mail, QR code, or paper
* Revoking credentials only removes data changes, existing data is accessible locally.

#### Physical
* Any device with a modern web browser and at least sporadic network connection.
* Physical security is dependent on keeping the hand-held device at secured, and using device-based authentification. (E.g. password, fingerprint or face recognition.) 

#### Software
* All transaction is within web browser (Google Chrome, Safari, Firefox, Edge, Opera) -- ECMAScript 11 level support required (~2017)
* Local copy of database and application is stored on the browser for PWA (Progressive Web App) support. Typically in browser cache for code, and indexDb for data.
* Software is completely provisioned from single site -- no content delivery networks or dependency chains.
* Communication is via SSL-secured web traffic.

## Threats
* Eavesdropping and man-in-the-middle: Unlikely with SSL communication with public key credentials
* Data at rest: Secure on server, vulnerable on remote device
* Reading data: Possible with access. Revoking access only revokes seeing forward changes.
* Changing data: Possible with access (revocable)
* Auditing changes: Yes (built into couchdb design)

## Possible Enhancements
### Remote
Since the application lives entirely within the browser, using third-party browser-securing techniques will be effective:
* At-rest encryption (remote) (pouchdb add-on or browser add-on)
* 2-factor or biometric authentication using add-on products

### Central
couchdb is a stable product with excellent security history. By design, access is whole-database granularity.
* At-rest encryption (server) using encrypted file-system
* Security techniques for remote administration access
* Swapping couchdb for alternative more-secure databases (IBM Cloudant, etc) that support the same replication protocol should be possible with only minor changes to initial access logic.
