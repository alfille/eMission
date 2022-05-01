### eMission specific page help
* General [screen layout](/help/GeneralLayout.md)
* Getting started
* Working with the application


# Add User
![](/images/UserEdit.png)

*Only for database administrator. Edit user information. Note that server access (via network or internet) is required.*

*Common uses would be to change a password or update an email address*

Requires passing through [User List](/help/UserList.md)

Initial choices are:

* *__Delete User__* (will ask for confirmation)
* *__Edit__* information (see below)

_________

![](/images/UserEdit_edit.png)

### Fields
* __name__: unique name for accessing the database. Appears as "User" in the bottom of the screen
* __password__: Password used to access the central database. Cannot be retrieved (stored encrypted) but a new one can be issued.
* __roles__: either *user* (regular access to use and edit the database) or *admin* can also perform user list functions
* __email address__: optional to help generate an invitation message. Also could be used for 2-factor authentication.

**__Save Changes__* or *__Cancel__* when done. Save will proceed to the [user data page](/help/UserSend.md)

