### eMission specific page help
* General [screen layout](GeneralLayout.md)
* Getting started
* Working with the application


# Add User
![](../images/UserNew.png)

*Only for database administrator. Add/edit users*

Requires passing through [User List](UserList.md)

### Fields
* __name__: unique name for accessing the database. Appears as "User" in the bottom of the screen
* __password__: Password used to access the central database. Cannot be retrieved (stored encrypted) but a new one can be issued.
* __roles__: either *user* (regular access to use and edit the database) or *admin* can also perform user list functions
* __email address__: optional to help generate an invitation message. Also could be used for 2-factor authentication.

**__Save Changes__* or *__Cancel__* when done. Save will proceed to the [user data page](UserSend.md)
