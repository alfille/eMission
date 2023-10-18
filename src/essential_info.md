# Essential information for setup

For our server configuration, we'll need 4 pieces of information

1. IP Address
  * __*ip_address*__
  * In format of "dotted quad"
  * e.g. 52.144.45.14
  * Provided by your [VPS provider](provisioning.html) when you create a cloud server
2. Domain Name
  * __*domain_name*__
  * Chose from a [domain name provider](domain.html)
  * e.g. emissionsystem.org
3. Server password
  * __*server_password*__
  * "root" will be your user name, the sever superuser 
  * after initial setup, the need for console access to the server should be rare
  * Used for [ssh](https://www.hostinger.com/tutorials/ssh/basic-ssh-commands) (secure shell) remote access to the server
4. Database administrator password
  * __*database_password*__
  * user name is *admin*
  * used in 
    * [couchdb setup](couchdb_initial.html)
    * mission creation
    * [administrative tasks](Administration.html)
  
