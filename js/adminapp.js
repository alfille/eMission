/* eMission project
 * Medical mission database application
 * See https://github.com/alfille/eMission
 * or https://emissionsystem.org
 * by Paul H Alfille 2023
 * MIT license
 * */

"use strict";

/* jshint esversion: 11 */

import {
    cloneClass,
    setButtons,
    TitleBox,
    } from "./globals_mod.js" ;

import {
    ImageImbedded,
    } from "./image_mod.js" ;

import {
    Id,
    Id_patient,
    Id_mission,
    Id_note,
    Id_operation,
    } from "./id_mod.js";

import {
    } from "./cookie_mod.js" ;

import {
    SortTable,
    } from "./sorttable_mod.js" ;

import {
    PatientData,
    PatientDataEditMode,
    PatientDataRaw,
    } from "./patientdata_mod.js" ;

import {
    } from "./log_mod.js" ;

import {
    SimpleNote,
    SimpleOperation,
    } from "./simple_mod.js" ;

import {
    } from "./replicate_mod.js" ;

// Database handles and  
const remoteUser = {
    database: "_users" ,
    username: "admin",
    password: "",
    address: "",
    };

class RemoteSecurity {
    constructor() {
        credentialList.forEach( c => this[c] = null ) ;
    }
    
    setup( user, pass ) {
        this.username = user;
        this.password = pass ;
        this.database = remoteCouch.database ;
        this.address = remoteCouch.address;
        this.header = new Headers( {
            "Content-Type" : "application/json",
            "Authorization": `Basic ${btoa([this.username,this.password].join(":"))}`, });
    }
    
    getUsers() {
        // gets Permitted users for this database
        return fetch( new URL(this.database+"/_security",this.address), {
            mode: "cors",
            credentials: "include",
            method: "GET",
            headers: this.header,
            origin: new URL(this.address),
            })
        .then( r => r.json() )
        ;
    }
    
    setUser(name,rolearray=[]){
        // set both admin and member 
        this.getUsers()
        .then( u => {
            // remove name
            ["admins","members"].forEach( role => u[role].names=u[role]?.names ? u[role].names.filter(n=>n!=name) : []);
            // Add name
            rolearray.forEach( role => u[role].names=u[role].names.concat(name) );
            return u;
            })
        .then( u => fetch(new URL(this.database+"/_security",this.address), {
            mode: "cors",
            credentials: "include",
            method: "PUT",
            headers: this.header,
            origin: new URL(this.address),
            body: JSON.stringify(u),
            }))
    }
    
    setRole( name, role, state ) {
        // set just admin or member (for checkbox)
        this.getUsers()
        .then( u => {
            // remove name
            u[role].names=u[role].names.filter(n=>n!=name);
            if ( state ) {
                u[role].names=u[role].names.concat(name);
            }
            return u;
            })
        .then( u => fetch(new URL(this.database+"/_security",this.address), {
            mode: "cors",
            credentials: "include",
            method: "PUT",
            headers: this.header,
            origin: new URL(this.address),
            body: JSON.stringify(u),
            }))
    }
        
    
    object() {
        return {
            username: this.username,
            password: this.password,
            database: this.database,
            address : this.address ,
        } ;
    }
}

objectSecurity = new RemoteSecurity();

// used to generate data entry pages "PatientData" type
const structDatabase = [
    {
        name: "username",
        hint: "Your user name for access",
        type: "text",
    },
    {
        name: "password",
        hint: "Your password for access",
        type: "text",
    },    
    {
        name: "address",
        alias: "Remote database server address",
        hint: "emissionsystem.org -- don't include database name",
        type: "text",
    },
    {
        name: "raw",
        alias: "  process address",
        hint: "Fix URL with protocol and port",
        type: "radio",
        choices: ["fixed","raw"],
    },
    {
        name: "database",
        hint: 'Name of patient information database (e.g. "ukraine"',
        type: "text",
    },
];

const structDatabaseInfo = [
    {
        name: "db_name",
        alias: "Database name",
        hint: "Name of underlying database",
        type: "text",
    },
    {
        name: "doc_count",
        alias: "Document count",
        hint: "Total number of undeleted documents",
        type: "number",
    },
    {
        name: "update_seq",
        hint: "Sequence number",
        type: "number",
    },
    {
        name: "adapter",
        alias: "Database adapter",
        hint: "Actual database type used",
        type: "text",
    },
    {
        name: "auto_compaction",
        alias: "Automatic compaction",
        hint: "Database compaction done automaticslly?",
        type: "text",
    },
];

const structNewUser = [
    {
        name: "name",
        hint: "User Name",
        type: "text",
    },
    {
        name: "password",
        hint: "User password",
        type: "password",
    } ,
    {
        name: "status",
        hint: "Role in Mission",
        type: "checkbox",
        choices: ["admin","member"],
    },
    {
        name: "email",
        alias: "email address",
        hint: "email address of user (optional but helps send invite)",
        type: "email",
    }
];

const structEditUser = [
    {
        name: "name",
        hint: "User Name",
        type: "text",
        readonly: "true",
    },
    {
        name: "password",
        hint: "User password",
        type: "password",
    } ,
    {
        name: "status",
        hint: "Role in Mission",
        type: "checkbox",
        choices: ["admin","member"],
    },
    {
        name: "email",
        alias: "email address",
        hint: "email address of user (optional but helps send invite)",
        type: "email",
    }
];
    
const structSuperUser = [
    {
        name: "username",
        alias: "Superuser name" ,
        hint: "Site administrator name",
        type: "text",
    },
    {
        name: "password",
        alias: "Superuser password" ,
        hint: "Site admnistrator password",
        type: "password",
    } ,
];

class DatabaseInfoData extends PatientData {
    savePatientData() {}
}

class DatabaseData extends PatientDataRaw {
    // starts with "EDIT" clicked
    constructor(...args) {
        if ( remoteCouch.database=="" ) {
            // First time
            super(true,...args); // clicked = true
            this.clickEditButtons() ;
        } else {
            super(false,...args); // clicked = false
        }
    }

    savePatientData() {
        if ( this.loadDocData()[0] ) {
            if ( this.doc[0].raw=="fixed" ) {
                this.doc[0].address=objectRemote.SecureURLparse(this.doc[0].address); // fix up URL
            }
            delete this.doc[0].raw ;
            objectCookie.set ( "remoteCouch", Object.assign({},this.doc[0]) );
        }
        objectPage.reset();
        location.reload(); // force reload
    }
}

class SuperUserData extends PatientDataEditMode {
    constructor( nextpage, click, ...args) {
        super(click, ...args);
        this.nextpage=nextpage
    }
    
    savePatientData() {
        this.loadDocData();

        objectRemote.closeRemoteDB()
        .then( () => {
            // remote User database
            remoteUser.username = this.doc[0].username;
            remoteUser.password = this.doc[0].password;
            objectUser.user_db = objectRemote.openRemoteDB( remoteUser );

            // admin access to this database
            objectSecurity.setup( remoteUser.username, remoteUser.password ) ;
            security_db = objectRemote.openRemoteDB( objectSecurity.object() );

            objectPage.show( this.nextpage ); })
        .catch( err => {
            objectPage.show( "SuperUser",this.nextpage );
            });
    }
}

class NewUserData extends PatientDataEditMode {
    savePatientData() {
        this.loadDocData();
        this.doc[0]._id = "org.couchdb.user:"+this.doc[0].name;
        this.doc[0].type = "user";
        if ( ! ("roles" in this.doc[0]) ) {
            // needs "roles" for valid user entry
            this.doc[0].roles=[];
        }
        let status = this.doc[0].status.map(s=>s+"s") ;
        delete this.doc[0].status // not stored in database -- put in permissions
        this.doc[0].quad = {
            'username':this.doc[0].name,
            'password':this.doc[0].password,
            'database':remoteCouch.database,
            'address' :remoteCouch.address,
        };
        objectUser.user_db.put( this.doc[0] )
        .then( response => objectUser.select( response.id ))
        .then( _ => objectSecurity.setUser( this.doc[0].name, status ) )
        .then( _ => objectPage.show( "SendUser" ) )
        .catch( err => {
            objectLog.err(err);
            objectPage.show( "UserList" );
            });
    }
}

class EditUserData extends PatientData {
    savePatientData() {
        if ( this.loadDocData()[0] ) {
            let status = this.doc[0].status.map(s=>s+"s") ;
            delete this.doc[0].status // note stored in database -- put in permissions

            this.doc[0].quad = Object.assign( {}, remoteCouch ) ;
            this.doc[0].quad.username = this.doc[0].name ;
            this.doc[0].quad.password = this.doc[0].password ;

            objectUser.user_db.put( this.doc[0] )
            .then( _ => objectSecurity.setUser( this.doc[0].name, status ) )
            .then( _ => objectPage.show( "SendUser" ) )
            .catch( err => {
                objectLog.err(err);
                objectPage.show( "UserList" );
                });
        } else if ( "quad" in this.doc[0] ) {
            objectPage.show( "SendUser" );
        } else {
            // no password to send
            objectLog.err("No stored password") ;
            objectPage.show( "UserList" );
        }
    }
}

objectNote = new SimpleNote() ;


objectOperation = new SimpleOperation() ;

class User { // convenience class
    constructor() {
    this.user_db = null ; // the special user couchdb database for access control
    this.id = null; // not cookie backed
    }
    del() {
        if ( this.id ) {
            this.user_db.get( this.id )
            .then( (doc) => {
                if ( confirm(`Delete user ${doc.name}.\n -- Are you sure?`) ) {
                    return this.user_db.remove(doc) ;
                } else {
                    throw "No delete";
                }
                })              
            .then( () => this.unselect() )
            .catch( (err) => objectLog.err(err) )
            .finally( () => objectPage.show( "UserList" ) );
        }
        return true;
    }    
    
    select( uid ) {
        this.id = uid;
        if ( objectPage.test("UserList") ) {
            objectTable.highlight();
        }
    }    

    unselect() {
        this.id = null;
    }

    getAllIdDoc() {
        let doc = {
            include_docs: true,
        } ;
        return this.user_db.allDocs(doc);
    }
    
    simple_url() {
        let url = new URL( "/index.html", window.location.href ) ;
        if ( url.hostname == 'localhost' ) {
            url = new URL( "/index.html", remoteCouch.address ) ;
            url.port = '';
        }
        return url
    }

    static make_url( user_dict ) {
        let url = objectUser.simple_url() ;
        credentialList.forEach( c => url.searchParams.append( c, user_dict[c] ) );
        return url ;
    }

    static bodytext( user_dict ) {
        return `Welcome, ${user_dict.username}, to eMission.

  eMission: software for managing medical missions
      in resource-poor environments.
      https://emissionsystems.org

You have an account:

  web address: ${remoteCouch.address}
     username: ${user_dict.username}
     password: ${user_dict.password}
     database: ${remoteCouch.database}

Full link (paste into your browser address bar):
  ${User.make_url( user_dict ).toString()}

We are looking forward to your participation.
`
        ;
    }

    static send( doc ) {
        if ( 'quad' in doc ) {
            document.getElementById("SendUserMail").href = "";
            document.getElementById("SendUserPrint").onclick=null;
            let url = objectUser.make_url(doc.quad);
            new QR(
                document.getElementById("SendUserQR"),
                url.toString(),
                200,200,
                4);
            document.getElementById("SendUserEmail").value = doc.email;
            document.getElementById("SendUserLink").value = url.toString();

            let mail_url = new URL( "mailto:" + doc.email );
            mail_url.searchParams.append( "subject", "Welcome to eMission" );
            mail_url.searchParams.append( "body", objectUser.bodytext(doc.quad) );
            document.getElementById("SendUserMail").href = mail_url.toString();
            document.getElementById("SendUserPrint").onclick=()=>objectUser.printUserCard(doc.quad);
        }
    }

    static printUserCard(user_dict) {
        let card = document.getElementById("printUser");
        let url = objectUser.make_url(user_dict);
        card.querySelector("#printUserText").innerText=objectUser.bodytext( user_dict ) ;
        new QR(
            card.querySelector(".qrUser"),
            url.toString(),
            300,300,
            4);

        objectPage.show_screen( "user" ) ;
    }
}
objectUser = new User() ;

class Mission { // convenience class
    static select() {
        patientId = missionId;
        Mission.getRecordId()
        .then( doc => TitleBox([doc.Mission,doc.Organization],"MissionInfo") ) ;
    }
    
    static getRecordId() {
        // return the Mission record, or a dummy
        // returns a promise, but can't fail!
        return db.get( missionId, { attachments: true, binary: true } )
        .then( doc => Promise.resolve(doc) )
        .catch( () => Promise.resolve({
            EndDate:null,
            Link:"",
            LocalContact:"",
            Location:"",
            Mission:remoteCouch.database,
            Name:remoteCouch.database,
            Organization:"",
            StartDate:null,
            type:"mission",
            _id:missionId,
            })
            );
    }

    static link() {
        Mission.getRecordId()
        .then( doc => {
            let src = new ImageImbedded( null,doc).source();
            document.querySelectorAll(".missionLogo")
            .forEach( logo => {
                logo.src=src??"images/Null.png";
                logo.addEventListener( 'click', () => window.open(doc.Link) );
                });
            document.querySelectorAll(".missionButton")
            .forEach( logo => {
                logo.addEventListener( 'click', () => window.open(doc.Link));
                logo.title = `Open ${doc.Mission} website`;
                });
            document.querySelectorAll(".missionButtonImage")
            .forEach( logo => logo.src=src??"images/Null.png" );
            })
        .catch( err => objectLog.err(err,"Mission info") ) ;
    }
}

class Page { // singleton class
    constructor() {
        // get page history from cookies
        // much simplified from app.js -- no checking of entries or history
        // since any unrecognized entries send us back to app.js
        this.path = displayState;
        this.lastscreen = null ; // splash/screen/patient for show_screen
        if ( this.path == null ) {
            this.reset() ;
        }
    }
    
    reset() {
        // resets to just MainMenu
        this.path = [ "MainMenu" ] ;
        objectCookie.set ( "displayState", this.path ) ;
    }

    back() {
        // don't check entry -- 'app.js' will do that
        this.path.shift() ;
        if ( this.path.length == 0 ) {
            this.reset();
        }
    }

    current() {
        if ( this.path.length == 0 ) {
            this.reset();
        }
        return this.path[0];
    }

    next( page = null ) {
        if ( page == "back" ) {
            this.back();
        } else if ( page == null ) {
            return ;
        } else {
            let iop = this.path.indexOf( page ) ;
            if ( iop < 0 ) {
                // add to from of page list
                this.path.unshift( page ) ;
            } else {
                // trim page list back to prior occurence of this page (no loops, finite size)
                this.path = this.path.slice( iop ) ;
            }
            objectCookie.set ( "displayState", this.path ) ;
        }
    }

    test( page ) {
        return this.current()==page ;
    }

    forget() {
        this.back();
    }

    link() {
        window.open( new URL(`/book/${this.current()}.html`,location.href).toString(), '_blank' );
    } 
    
    show( page = "Administration", extra="" ) { // main routine for displaying different "pages" by hiding different elements
        if ( db == null || credentialList.some( c=> remoteCouch[c]=='' ) ) {
            if ( page != "RemoteDatabaseInput" ) {
                this.show("RemoteDatabaseInput");
            }
        }

        this.next(page) ; // update reversal list

        // clear old image urls
        ImageImbedded.clearSrc() ;
        ImageImbedded.clearSrc() ;

        this.show_screen( "screen" ); // basic page display setup

        // send to page-specific code
        const page_class = Pagelist.subclass(objectPage.current()) ;
        if ( page_class ) {
            page_class.show(extra) ;
        } else {
            window.location.href="/index.html" ;
        }
    }

   show_screen( type ) { // switch between screen and print
        if ( type !== this.lastscreen ) {
            this.lastscreen == type ;
            document.getElementById("splash_screen").style.display = "none";
            let showscreen = {
                ".work_screen": type=="screen",
                ".print_user": type == "user",
            };
            for ( let cl in showscreen ) {
                document.querySelectorAll(cl)
                .forEach( (v)=> v.style.display=showscreen[cl]?"block":"none"
                );
            }
            if ( type!=="screen" ) {
                printJS({
                    printable:"printUser",
                    type:"html",
                    ignoreElements:["printCardButtons"],
                    documentTitle:"Name and Credentials",
                    onPrintDialogClose: ()=>objectPage.show("back"),
                });
            }
        }
    }    
}

class Pagelist {
    // list of subclasses = displayed "pages"
    // Note that these classes are never "instantiated -- only used statically
    static pages = {} ; // [pagetitle]->class -- pagetitle ise used by HTML to toggle display of "pages"
    // prototype to add to pages
    static AddPage() { Pagelist.pages[this.name]=this; }
    // safeLanding -- safe to resume on this page
    static safeLanding = true ; // default
    
    static show(extra="") {
        // set up display
        document.querySelector(".patientDataEdit").style.display="none"; 
        document.querySelectorAll(".topButtons")
            .forEach( tb => tb.style.display = "block" );

        document.querySelectorAll(".pageOverlay")
            .forEach( po => po.style.display = po.classList.contains(this.name) ? "block" : "none" );

        this.subshow(extra);
    }
    
    static subshow(extra="") {
        // default version, derived classes may overrule
        // Simple menu page
    }
    
    static subclass(pagetitle) {
        let cls = Pagelist.pages[pagetitle] ?? null ;
        if ( cls ) {
            return cls ;
        } else {
            // unrecognized entry -- will force return to main
            return null ;
        }
    } 
}

class RemoteDatabaseInput extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        const doc = Object.assign({},remoteCouch) ;
        doc.raw = "fixed";
        objectPatientData = new DatabaseData( doc, structDatabase );
    }
}

class Administration extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
}

class DatabaseInfo extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        db.info()
        .then( doc => {
            objectPatientData = new DatabaseInfoData( doc, structDatabaseInfo );
            })
        .catch( err => objectLog.err(err) );
    }
}

class ErrorLog extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        objectLog.show() ;
    }
}

class MissionMembers extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        if ( objectUser.user_db == null ) {
            objectPage.show( "SuperUser","MissionMembers" );
        } else {
            let rows = [] ;
            objectTable = new MissionMembersTable();
            objectUser.getAllIdDoc()
            .then( docs => rows = docs.rows.filter( r=> r?.doc?.type == "user" ) )
            .then( _ => objectSecurity.getUsers() )
            .then( sec => rows.forEach( row => row.doc.mission = 
                ["members","admins"]
                .filter( role => sec[role].names && sec[role].names.includes(row.doc.name))
                .map( r => r.slice(0,-1) )
                ))
            .then( _ => objectTable.fill(rows ) )
            .catch( (err) => {
                objectLog.err(err);
                objectPage.show ( "back" );
                });
        }
    }
}

class PatientMerge extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static transfer = {};
    static test="HI";
    
    static not_mergeable() {
        return (PatientMerge.transfer?.to==undefined) || (PatientMerge.transfer?.from==undefined) || (PatientMerge.transfer.to == PatientMerge.transfer.from) ;
    }
    
    static gotMessage(e) {
        let target=null;
        switch ( e.data?.frame ) {
            case 'from':
                target='fromlabel';
                break;
            case 'to':
                target='tolabel';
                break;
            default:
                return ;
            }
        document.getElementById(target).innerHTML=`Name: <B>${e.data.doc.FirstName} ${e.data.doc.LastName}</B><br>ID: <B>${e.data.doc._id}</B>` ;
        PatientMerge.transfer[e.data.frame]=e.data.doc._id;
        document.getElementById("patientMergeButton").disabled=PatientMerge.not_mergeable();
            
    }

    static subshow(extra="") {
        document.getElementById('fromlabel').innerHTML="";
        document.getElementById('tolabel').innerHTML="";
        document.getElementById("patientMergeButton").disabled=this.not_mergeable();

        this.transfer = {} ;
        let u = new URL(location.href);
        u.pathname="/index.html";
        
        u.searchParams.append("frame","from");
        document.getElementById("fromframe").src=u.toString();
        
        u.searchParams.delete("frame");
        u.searchParams.append("frame","to");
        document.getElementById("toframe").src=u.toString();
        
        window.addEventListener('message',this.gotMessage);
    }
    
    static leave() {
        window.removeEventListener('message',this.gotMessage);
        objectPage.show( 'back' );
    }
    
    static merge() {
        if ( ! PatientMerge.not_mergeable() ) {
            db.get(PatientMerge.transfer.from,{attachments:true})
            .then( fromdoc => {
                // Make old patient record a note (to document merge and save old data)
                let doc = {
                    _id: Id_note.makeId(PatientMerge.transfer.to),
                    title:"Patient Merge Note",
                    text:Object.keys(fromdoc)
                        .filter(k=>k.slice(0,1)!="_")
                        .map(k=>`${k}:${fromdoc[k]}`)
                        .join("  "),
                    type:"note",
                    author:fromdoc?.author ?? "",
                    category:"Uncategorized",
                    patient_id:PatientMerge.transfer.to,
                    date: new Date().toISOString(),
                    _attachments:{}, 
                };
                if ( "_attachments" in fromdoc ) {
                    Object.assign(doc._attachments,fromdoc._attachments);
                } else {
                    delete doc._attachments;
                }
                return Promise.all([db.put(doc),db.remove(fromdoc)]);
            })
            .then( _ => objectNote.getRecordsId( PatientMerge.transfer.from ) )
            .then( nlist => Promise.all( nlist.rows.map( r => 
                // convert notes to new id and delete old
                db.get(r.id,{attachments:true})
                .then(doc => {
                    let newdoc = Object.assign({},doc);
                    delete newdoc._rev;
                    newdoc.patient_id = PatientMerge.transfer.to;
                    newdoc._id = Id_note.makeIdKey( PatientMerge.transfer.to, Id_note.splitId(doc._id).key);
                    return Promise.all([db.put(newdoc),db.remove(doc)]);
                    })
                 )))
            .then( _ => objectOperation.getRecordsId( PatientMerge.transfer.from ) )
            .then( olist => Promise.all( olist.rows.map( r => 
                // convert operations to new id and delete old
                db.get(r.id,{attachments:true})
                .then(doc => {
                    if ( objectOperation.nullOp(doc) ) {
                        // no real operations -- just delete
                        return db.remove(doc);
                    } else {
                        let newdoc = Object.assign({},doc);
                        delete newdoc._rev;
                        newdoc.patient_id = PatientMerge.transfer.to;
                        newdoc._id = Id_operation.makeIdKey( PatientMerge.transfer.to, Id_operation.splitId(doc._id).key);
                        return Promise.all([db.put(newdoc),db.remove(doc)]);
                    }}) 
                )))
            .then( l => console.log(l) )
            ;
        }
        PatientMerge.leave();
    }
}
globalThis. PatientMerge = PatientMerge ;

class PrintYourself extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="MainMenu") {
        objectUser.printUserCard(remoteCouch);
    }
}

class SendUser extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        if ( objectUser.user_db == null ) {
            objectPage.show( "SuperUser","SendUser" );
        } else if ( objectUser.id == null ) {
            objectPage.show( "back" );
        } else {
            objectUser.user_db.get( objectUser.id )
            .then( doc => objectUser.send( doc ) )
            .catch( err => {
                objectLog.err(err);
                objectPage.show( "back" );
                });
        }
    }
}

class SuperUser extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="UserList") {
        remoteUser.address = remoteCouch.address;
        objectPatientData = new SuperUserData( extra, Object.assign({},remoteUser), structSuperUser );
    }
}

class UserEdit extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        if ( objectUser.user_db == null ) {
            objectPage.show( "SuperUser","UserEdit" );
        } else if ( objectUser.id == null ) {
            objectPage.show( "back" );
        } else {
            let sec=null;
            objectSecurity.getUsers()
            .then( s => sec=s )
            .then( _ => objectUser.user_db.get( objectUser.id ) )
            .then( doc => {
                // membership in this mission
                doc.status = ["member","admin"].filter(role=>sec[role+"s"].names && sec[role+"s"].names.includes(doc.name));
                if ( 'quad' in doc ) {
                    // stored credentials
                    // username cannot be changed (restriction in _user table)
                    // address and database are set but not used
                    doc.password = doc.quad.password ;
                }
                objectPatientData = new EditUserData( doc, structEditUser );
                })
            .catch( err => {
                objectLog.err(err);
                objectUser.unselect();
                objectPage.show( "back" );
                });
        }
    }
}

class UserList extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        if ( objectUser.user_db == null ) {
            objectPage.show( "SuperUser","UserList" );
        } else {
            let rows = [] ;
            objectTable = new UserTable();
            objectUser.getAllIdDoc()
            .then( docs => rows = docs.rows.filter( r=> r?.doc?.type == "user" ) )
            .then( _=> rows.forEach( r => r.doc.mission = "-none-" ) )
            .then( _ => objectSecurity.getUsers() )
            .then( sec => ["members","admins"].forEach(role=> rows.forEach( row => {
               if ( sec[role].names && sec[role].names.includes(row.doc.name) ) { row.doc.mission = role.slice(0,-1); } 
                })))
            .then( _ => objectTable.fill(rows ) )
            .catch( (err) => {
                objectLog.err(err);
                objectPage.show ( "back" );
                });
        }
    }
}

class UserNew extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        if ( objectUser.user_db == null ) {
            objectPage.show( "SuperUser","UserNew" );
        } else {
            objectUser.unselect();
            objectPatientData = new NewUserData( {status:["member"]}, structNewUser );
        }
    }
}

class UserTable extends SortTable {
    constructor() {
        super(
            ["name", "mission", "email", ], 
            "UserList"
            );
    }

    selectId() {
        return objectUser.id;
    }

    selectFunc(id) {
        objectUser.select(id) ;
    }

    editpage() {
        objectPage.show("UserEdit");
    }
}

class MissionMembersTable extends SortTable {
    constructor() {
        super(
            ["name", "mission", "email", ], 
            "UserList",
            [
                ["mission","Mission", (doc)=>["member","admin"].map(role=>`<label class="nowrap">${role}<input type="checkbox" onclick="objectSecurity.setRole('${doc.name}','${role}s',this.checked)" ${doc.mission.includes(role)?'checked':''}></label>`).join("")],
            ] 
            );
    }
    
    fill( doclist ) {
        // typically called with doc.rows from allDocs
        let tbody = this.tbl.querySelector('tbody');
        tbody.innerHTML = "";
        //let collist = this.collist;
        doclist.forEach( (doc) => {
            let row = tbody.insertRow(-1);
            let record = doc.doc;
            row.setAttribute("data-id",record._id);
            /* Select and edit -- need to make sure selection is complete*/
            this.collist.forEach( (colname,i) => {
                let c = row.insertCell(i);
                c.innerHTML=(this.aliases[colname].value)(record) ;
            });
        });
        this.highlight();
    }
    
    selectId() {
        return objectUser.id;
    }

    selectFunc(id) {
        objectUser.select(id) ;
    }

    editpage() {
        objectPage.show("UserEdit");
    }
}

function parseQuery() {
    // returns a dict of keys/values or null
    const url = new URL(location.href);
    let r = {};
    for ( let [n,v] of url.searchParams) {
        r[n] = v;
    }
    //location.search = "";
    return r;
}

function URLparse() {
    // need to establish remote db and credentials
    // first try the search field
    const qline = parseQuery();
    
    if ( Object.keys(qline).length > 0 ) {
        // non-empty search field -- send back to index.html
        let u = new URL(window.location.href) ;
        u.pathname = "/index.html" ;
        window.location.href = u.toString()
    }
    objectRemote.start() ;
}

// Application starting point
window.onload = () => {
    // Get Cookies
    objectCookie.initialGet() ;
    objectPage = new Page();
        
    // Stuff into history to block browser BACK button
    window.history.pushState({}, '');
    window.addEventListener('popstate', ()=>window.history.pushState({}, '') );

    // Service worker (to manage cache for off-line function)
    if ( 'serviceWorker' in navigator ) {
        navigator.serviceWorker
        .register('/sw.js')
        .catch( err => objectLog.err(err,"Service worker registration") );
    }
    
    setButtons() ;

    // set state from URL or cookies
    URLparse() ; // look for remoteCouch and exclude command line parameters

    // Start pouchdb database       
    if ( credentialList.every( c=> remoteCouch[c] !== "" ) ) {
        db = new PouchDB( remoteCouch.database, {auto_compaction: true} ); // open local copy
        document.querySelectorAll(".headerboxlink")
        .forEach( q => q.addEventListener("click",()=>objectPage.show("MainMenu")));

        // start sync with remote database
        objectRemote.foreverSync();

        // set link for mission
        Mission.link();
        Mission.select();

        // now jump to proper page
        objectPage.show( null ) ;

    } else if ( objectPage.current() == "RemoteDatabaseInput" ) {
        // now jump to proper page
        objectPage.show( null ) ;

    } else {
        db = null;
        objectPage.reset();
        objectPage.show("FirstTime");
    }

};
