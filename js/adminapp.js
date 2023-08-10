"use strict";

/* jshint esversion: 11 */

// singleton class instances
var objectPatientData;
var objectNoteList={};
    objectNoteList.category = 'Uncategorized' ;
var objectTable = null;
var objectRemote = null;
var objectCollation = null;
var objectLog = null;

// globals cookie backed
var objectPage ;
var patientId;
var noteId;
var operationId;
var remoteCouch;
var DCTOHClogo = "images/DCTOHC11.jpg";

// Database handles and  
var db ; // will be Pouchdb local copy 
var security_db = null ;
const remoteUser = {
    database: "_users" ,
    username: "admin",
    password: "",
    address: "",
    };
const remoteSecurity = {
    database: "" , // set in SuperUser
    username: "", // set in SuperUser
    password: "", // set in SuperUser
    address: "", // set in SuperUser
    };

class Id {
    static version = 0;
    static start="";
    static end="\\fff0";
    
    static splitId( id ) {
        if ( id ) {
            const spl = id.split(";");
            return {
                type:    spl[0] ?? null,
                version: spl[1] ?? null, // 0 so far
                last:    spl[2] ?? null,
                first:   spl[3] ?? null,
                dob:     spl[4] ?? null,
                key:     spl[5] ?? null, // really creation date
            };
        }
        return null;
    }
    
    static joinId( obj ) {
        return [
            obj.type,
            obj.version,
            obj.last,
            obj.first,
            obj.dob,
            obj.key
            ].join(";");
    }
    
    static makeIdKey( pid, key=null ) {
        let obj = this.splitId( pid ) ;
        if ( key==null ) {
            obj.key = new Date().toISOString();
        } else {
            obj.key = key;
        }
        obj.type = this.type;
        return this.joinId( obj );
    }
    
    static makeId( pid=patientId ) { // Make a new Id for a note or operation using current time as the last field
        return this.makeIdKey(pid);
    }
    
    static allStart() { // Search entire database
        return [this.type, this.start].join(";");
    }
    
    static allEnd() { // Search entire database
        return [this.type, this.end].join(";");
    }

    static patStart( pid=patientId ) { // Search just this patient's records
        return this.makeIdKey( pid, this.start ) ;
    }    

    static patEnd( pid=patientId ) { // Search just this patient's records
        return this.makeIdKey( pid, this.end ) ;
    }    
}
      
class Id_patient extends Id{
    static type = "p";
    static makeId( doc ) {
        // remove any ';' in the name
        return [
            this.type,
            this.version,
            (doc.LastName??"").replace(/;/g,"_"),
            (doc.FirstName??"").replace(/;/g,"_"),
            (doc.DOB??"").replace(/;/g,"_")
            ].join(";");
    }
    static splitId( id=patientId ) {
        return super.splitId(id);
    }
}

class Id_note extends Id{
    static type = "c";        
    static splitId( id=noteId ) {
        return super.splitId(id);
    }
}

class Id_operation extends Id{
    static type = "o";
    static splitId( id=operationId ) {
        return super.splitId(id);
    }
}

class Id_mission extends Id_patient{
    static type = "m";
    static makeId() {
        return super.makeId({});
    }
    static splitId( id=missionId ) {
        return super.splitId(id);
    }
}
var missionId = Id_mission.makeId() ;

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
        type: "password",
    },    
    {
        name: "address",
        alias: "Remote database server address",
        hint: "https://location -- don't include database name",
        type: "text",
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
        hint: "User Name (can be email address)",
        type: "text",
    },
    {
        name: "password",
        hint: "User password",
        type: "password",
    } ,
    {
        name: "roles",
        hint: "Regular user or administrator",
        type: "radio",
        roles: ["user","admin"],
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
        hint: "User Name (can be email address)",
        type: "text",
        readonly: "true",
    },
    {
        name: "password",
        hint: "User password",
        type: "password",
    } ,
    {
        name: "roles",
        hint: "Regular user or administrator",
        type: "radio",
        roles: ["user","admin"],
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


class ImageImbedded {
    static srcList = [] ;
    
    constructor( parent, doc, backup ) {
        this.doc = doc;
        this.parent = parent;
        this.backup=backup;
        this.fromDoc();
    }
    
    fromDoc() {
        let data = this.doc ?._attachments ?.image ?.data;
        if ( data === undefined ) {
            this.src = this.backup ?? null ;
        } else {
            this.src = URL.createObjectURL(data);
            this.addSrc();
        }
        this.upload=null;
    }

    addSrc() {
        ImageImbedded.srcList.push( this.src ) ;
    }

    static clearSrc() {
        ImageImbedded.srcList.forEach( s => URL.revokeObjectURL( s ) );
        ImageImbedded.srcList = [] ;
    }

    source() {
        return this.src;
    }

    static showBigPicture( target ) {
        let big = document.querySelector( ".FloatPicture" );
        big.src = target.src;
        big.style.display = "block";
    }
    
    static hideBigPicture( target ) {
        target.src = "";
        target.style.display = "none";
    }

    display() {
        let img = this.parent.querySelector( "img");
        if ( img ) {
            img.addEventListener( 'click', () => ImageImbedded.showBigPicture(img) );
            if ( this.src ) {
                img.src = this.src;
                img.style.display = "block";
            } else {
                img.src = "//:0";
                img.style.display = "none" ;
            }
        }
    }
        
    revert() {
        this.fromDoc();
        this.display();
    }

    addListen() {
        try { this.parent.querySelector( ".imageRevert").addEventListener( 'click', () => this.revert() ); }
            catch { // empty 
                }
        try { this.parent.querySelector( ".imageGet").addEventListener( 'click', () => this.getImage() ); }
            catch { // empty 
                }
        try { this.parent.querySelector( ".imageRemove").addEventListener( 'click', () => this.remove() ); }
            catch { // empty 
                }
        try { this.parent.querySelector( ".imageBar").addEventListener( 'change', () => this.handle() ); }
            catch { // empty 
                }
    }

    remove() {
        this.upload="remove";
        this.src=this.backup ?? null ;
        this.display();
    }

    getImage() {
        let inp = this.parent.querySelector(".imageBar");
        if ( isAndroid() ) {
            inp.removeAttribute("capture");
        } else {
            inp.setAttribute("capture","environment");
        }
        inp.click();
    }

    handle() {
        const files = this.parent.querySelector('.imageBar') ;
        this.upload = files.files[0];
        this.src = URL.createObjectURL(this.upload);
        this.addSrc();
        this.display();
        try { this.parent.querySelector(".imageRemove").disabled = false; }
            catch{ // empty
                }
    }

    save(doc) {
        if ( this.upload == null ) { // ignore
        } else if ( this.upload == "remove" ) {
            if ( "_attachments" in doc ) {
                delete doc._attachments;
            }
        } else {
            Object.assign(
                doc,
                { _attachments: {
                    image: {
                        content_type: this.upload.type,
                        data: this.upload,
                        }
                }} );
        }
    }

    changed() {
        return this.upload != null;
    }
}

// data entry page type
// except for Noteslist and some html entries, this is the main type
class PatientDataRaw { // singleton class
    constructor(click,...args) {
        // args is a list of "docs" to update"
        this.parent = document.getElementById("PatientDataContent");
        let fieldset = document.getElementById("templates").querySelector(".dataFieldset");
        
        this.doc = [];
        this.struct = [];
        this.ul = [];
        this.pairs = 0;
        this.images={} ;

        for ( let iarg = 0; iarg<args.length; ++iarg ) {
            this.doc[this.pairs] = args[iarg];
            ++ iarg;
            if ( iarg == args.length ) {
                break;
            }
            this.struct[this.pairs] = args[iarg];
            ++ this.pairs;
        } 
        
        document.querySelectorAll(".edit_data").forEach( (e) => {
            e.disabled = false;
        });
        this.parent.innerHTML = "";
        
        for ( let ipair = 0; ipair < this.pairs; ++ ipair ) {
            let fs = fieldset.cloneNode( true );
            this.ul[ipair] = this.fill( ipair, click );
            fs.appendChild( this.ul[ipair] );
            this.parent.appendChild( fs );
        }
    }
    
    fill( ipair, click ) {
        let doc = this.doc[ipair];
        let struct = this.struct[ipair];

        let ul = document.createElement('ul');
        
        struct.forEach( ( item, idx ) => {
            let li = document.createElement("li");
            li.setAttribute("data-index",idx);
            let lab = document.createElement("label");
            li.appendChild(lab);
            let localname = [item.name,idx,ipair].map( x=>x+'').join("_");
            
            // possibly use an alias instead of database field name
            if ( "alias" in item ) {
                lab.appendChild( document.createTextNode(`${item.alias}: `) );
            } else {
                lab.appendChild( document.createTextNode(`${item.name}: `) );
            }
            lab.title = item.hint;

            // get prior choices for fill-in choice
            let choices = Promise.resolve([]) ;
            if ( "choices" in item ) {
                choices = Promise.resolve(item.choices) ;
            } else if ( "query" in item ) {
                choices = db.query(item.query,{group:true,reduce:true}).then( q=>q.rows.map(qq=>qq.key).filter(c=>c.length>0) ) ;
            } else if ( "roles" in item ) {
                choices = Promise.resolve( item.roles.map( r => [remoteCouch.database,"all"].map( d=> [d,r].join("-"))).reduce( (a,e)=>a.concat(e)) );
            }

            // get value and make type-specific input field with filled in value
            let inp = null;
            let preVal = item.name.split(".").reduce( (arr,arg) => arr && arr[arg] , doc ) ;
            switch( item.type ) {
                case "image":
                    inp = document.createElement("div");
                    cloneClass( ".imagetemplate", inp ) ;
                    this.images[localname] = new ImageImbedded( inp, doc, item?.none ) ;
                    this.images[localname].display() ;
                    lab.appendChild(inp);
                    if ( click ) {
                        this.clickEditItem(ipair,li);
                    }
                    break ;
                case "radio":
                    choices
                    .then( clist => clist.forEach( (c) => {
                        inp = document.createElement("input");
                        inp.type = item.type;
                        inp.name = localname;
                        inp.value = c;
                        inp.disabled = true;
                        if ( c == preVal??"" ) {
                            inp.checked = true;
                            inp.disabled = false;
                        } else {
                            inp.disabled = true;
                        }
                        inp.title = item.hint;
                        lab.appendChild(inp);
                        lab.appendChild( document.createTextNode(c) );
                        }))
                    .then( () => {
                        if ( click ) {
                            this.clickEditItem(ipair,li);
                        }
                        }); 
                    break ;

                case "checkbox":
                    choices
                    .then( clist => clist.forEach( (c) => {
                        inp = document.createElement("input");
                        inp.type = item.type;
                        inp.name = localname;
                        inp.value = c;
                        inp.disabled = true;
                        if ( (preVal??[]).includes(c) ) {
                            inp.checked = true;
                            inp.disabled = false;
                        } else {
                            inp.disabled = true;
                        }
                        inp.title = item.hint;
                        lab.appendChild(inp);
                        lab.appendChild( document.createTextNode(c) );
                        }))
                    .then( () => {
                        if ( click ) {
                            this.clickEditItem(ipair,li);
                        }
                        }); 
                    break;

                case "list":
                    {
                    let dlist = document.createElement("datalist");
                    dlist.id = localname ;
                    inp = document.createElement("input");
                    inp.type = "text";
                    inp.setAttribute( "list", dlist.id );
                    inp.value = preVal??"";
                    inp.readOnly = true;
                    inp.disabled = true;
                    lab.appendChild( dlist );
                    lab.appendChild( inp );                    
                        
                    choices
                    .then( clist => clist.forEach( (c) => {
                        let op = document.createElement("option");
                        op.value = c;
                        dlist.appendChild(op);
                        }))
                    .then( () => {
                        if ( click ) {
                            this.clickEditItem(ipair,li);
                        }
                        }); 
                    }
                    break;
                case "datetime":
                    inp = document.createElement("input");
                    inp.type = "text";
                    inp.value = preVal ? flatpickr.formatDate(new Date(preVal), "Y-m-d h:i K"):"" ;
                    inp.title = "Date and time in format YYYY-MM-DD HH:MM AM";
                    inp.readOnly = true;
                    lab.appendChild( inp );                    
                    if ( click ) {
                        this.clickEditItem(ipair,li);
                    }
                    break;
                case "date":
                    inp = document.createElement("input");
                    inp.classList.add("flatpickr","flatpickr-input");
                    inp.type = "text";
                    inp.size = 10;
                    inp.value = preVal??"";
                    inp.readOnly = true;
                    inp.title = "Date in format YYYY-MM-DD";
                    lab.appendChild(inp);
                    if ( click ) {
                        this.clickEditItem(ipair,li);
                    }
                    break;
                case "time":
                    inp = document.createElement("input");
                    inp.classList.add("flatpickr","flatpickr-input");
                    inp.type = "text";
                    inp.size = 9;
                    inp.readOnly = true;
                    inp.value = preVal??"";
                    inp.title = "Time in format HH:MM PM or HH:MM AM";
                    lab.appendChild(inp);
                    if ( click ) {
                        this.clickEditItem(ipair,li);
                    }
                    break;
                case "length":
                    inp = document.createElement("input");
                    inp.classList.add("flatpickr","flatpickr-input");
                    inp.readOnly = true;
                    inp.type = "text";
                    inp.size = 6;
                    inp.value = PatientData.HMfromMin(preVal??"");
                    inp.title = "Time length in format HH:MM";
                    lab.appendChild(inp);
                    if ( click ) {
                        this.clickEditItem(ipair,li);
                    }
                    break;
                default:
                    inp = document.createElement( item.type=="textarea" ? "textarea" : "input" );
                    inp.title = item.hint;
                    inp.readOnly = true;
                    inp.value = preVal??"" ;
                    lab.appendChild(inp);
                    if ( click ) {
                        this.clickEditItem(ipair,li);
                    }
                    break;
            }                
            
            ul.appendChild( li );
        });
        
        return ul;
    }

    static HMtoMin ( inp ) {
        if ( typeof inp != 'string' ) {
            throw "bad";
        }
        let d = inp.match( /\d+/g );
        if ( (d == null) || d.length < 2 ) {
            throw "bad";
        }
        return parseInt(d[0]) * 60 + parseInt(d[1]);
    }
        
    static HMfromMin ( min ) {
        if ( typeof min == 'number' ) {
            return (Math.floor(min/60)+100).toString().substr(-2) + ":" + ((min%60)+100).toString().substr(-2);
        } else {
            return "00:00";
        }
    }
        
    fsclick( target ) {
        if ( this.pairs > 1 ) {
            let ul = target.parentNode.parentNode.querySelector("ul");
            if ( target.value === "show" ) {
                // hide
                target.innerHTML = "&#10133;";
                ul.style.display = "none";
                target.value = "hide";
            } else {
                // show
                target.innerHTML = "&#10134;";
                ul.style.display = "";
                target.value = "show";
            }
        }
    }
    
    clickEdit() {
        this.clickEditButtons();
        for ( let ipair=0; ipair<this.pairs; ++ipair ) {
            this.ul[ipair].querySelectorAll("li").forEach( (li) => this.clickEditItem( ipair, li ) );
        }
    }
    
    clickEditButtons() {
        document.querySelectorAll(".topButtons").forEach( v=>v.style.display="none" ); 
        document.querySelector(".patientDataEdit").style.display="block";
        document.querySelectorAll(".edit_data").forEach( (e) => {
            e.disabled = true;
        });
    }
    
    clickEditItem(ipair,li) {
        let idx = li.getAttribute("data-index");
        let struct = this.struct[ipair];
        let localname = [struct[idx].name,idx,ipair].map(x=>x+'').join("_");
        if ( struct[idx] ?.readonly == "true" ) {
            return;
        }
        switch ( struct[idx].type ) {
            case "image":
                cloneClass(".imagetemplate_edit",li.querySelector("div"));
                this.images[localname].display();
                this.images[localname].addListen();
                break;
            case "radio":
            case "checkbox":
                document.getElementsByName(localname).forEach( (i) => i.disabled = false );
                break;
            case "date":
                li.querySelector("input").readOnly = false;
                flatpickr( li.querySelector("input"),
                    {
                        enableTime: false,
                        noCalendar: false,
                        dateFormat: "Y-m-d",
                        //defaultDate: Date.now(),
                    });
                break;
            case "time":
                li.querySelector("input").readOnly = false;
                flatpickr( li.querySelector("input"),
                    {
                        enableTime: true,
                        noCalendar: true,
                        dateFormat: "h:i K",
                        //defaultDate: "9:00",
                    });
                break;
            case "length":
                li.querySelector("input").readOnly = false;
                flatpickr( li.querySelector("input"),
                    {
                        dateFormat: "H:i",
                        time_24hr: true,
                        enableTime: true,
                        noCalendar: true,
                        minuteIncrement: 5,
                        formatDate: "H:i",
                        //defaultDate: "09:00",
                    });
                break;
            case "datetime":
                li.querySelector("input").readOnly = false;
                flatpickr( li.querySelector("input"),
                    {
                        time_24hr: false,
                        enableTime: true,
                        noCalendar: false,
                        dateFormat: "Y-m-d h:i K",
                        //defaultDate: Date.now(),
                    });
                break;
            case "textarea":
                li.querySelector("textarea").readOnly = false;
                break;
            case "list":
                li.querySelector("input").readOnly = false;
                li.querySelector("input").disabled = false;
                break;
            default:
                li.querySelector("input").readOnly = false;
                break;
        }
    }
    
    loadDocData() {
        //return true if any real change
        let changed = []; 
        for ( let ipair=0; ipair<this.pairs; ++ipair ) {
            let doc    = this.doc[ipair];
            let struct = this.struct[ipair];
            let ul     = this.ul[ipair];
            changed[ipair] = false;
            ul.querySelectorAll("li").forEach( (li) => {
                let idx = li.getAttribute("data-index");
                let postVal = "";
                let name = struct[idx].name;
                let localname = [struct[idx].name,idx,ipair].map(x=>x+'').join("_");
                switch ( struct[idx].type ) {
                    case "image":
                        // handle separately
                        break;
                    case "radio":
                        postVal = [...document.getElementsByName(localname)]
                            .filter( i => i.checked )
                            .map(i=>i.value)[0];
                        break;
                    case "datetime":
                        try {
                            postVal = new Date(flatpickr.parseDate(li.querySelector("input").value, "Y-m-d h:i K")).toISOString();
                        } catch {
                            postVal="";
                        }
                        break;
                    case "checkbox":
                        postVal = [...document.getElementsByName(localname)]
                            .filter( i => i.checked )
                            .map( i => i.value );
                        break;
                    case "length":
                        postVal = PatientData.HMtoMin( li.querySelector("input").value );
                        break;
                    case "textarea":
                        postVal = li.querySelector("textarea").value;
                        break;
                    default:
                        postVal = li.querySelector("input").value;
                        break;
                }
                if ( struct[idx].type != "image" ) {
                    if ( postVal != name.split(".").reduce( (arr,arg) => arr && arr[arg] , doc ) ) {
                        changed[ipair] = true;
                        Object.assign( doc, name.split(".").reduceRight( (x,n) => ({[n]:x}) , postVal ));
                    }
                } else {
                    // image
                    if ( this.images[localname].changed() ) {
                        changed[ipair] = true;
                        this.images[localname].save(doc) ;
                    }
                }
            });
        }
        return changed;
    }
    
    saveChanged ( state ) {
        let changed = this.loadDocData();
        Promise.all( this.doc.filter( (doc, idx) => changed[idx] ).map( (doc) => db.put( doc ) ) )
            .catch( (err) => objectLog.err(err) )
            .finally( () => objectPage.show( state ) );
    }
    
    savePatientData() {
        this.saveChanged( "PatientPhoto" );
    }
}

class PatientData extends PatientDataRaw {
    constructor(...args) {
        super(false,...args); // clicked = false
    }
}

class PatientDataEditMode extends PatientDataRaw {
    // starts with "EDIT" clicked
    constructor(...args) {
        super(true,...args); // clicked = true
        this.clickEditButtons() ;
    }
}

class DatabaseInfoData extends PatientData {
    savePatientData() {}
}

class DatabaseData extends PatientDataEditMode {
    savePatientData() {
        if ( this.loadDocData()[0] ) {
            this.doc[0].address=objectRemote.SecureURLparse(this.doc[0].address); // fix up URL
            Cookie.set ( "remoteCouch", Object.assign({},this.doc[0]) );
        }
        objectPage.reset();
        location.reload(); // force reload
    }
}

class SuperUserData extends PatientDataEditMode {
    savePatientData() {
        this.loadDocData();

        objectRemote.closeRemoteDB()
        .then( () => {
            // remote User database
            remoteUser.username = this.doc[0].username;
            remoteUser.password = this.doc[0].password;
            User.db = objectRemote.openRemoteDB( remoteUser );

            // admin access to this database
            remoteSecurity.username = remoteUser.username;
            remoteSecurity.password = remoteUser.password;
            remoteSecurity.address  = remoteCouch.address;
            remoteSecurity.database = remoteCouch.database;        
            security_db = objectRemote.openRemoteDB( remoteSecurity );

            objectPage.show( "UserList" ); })
        .catch( err => {
            alert( err );
            objectPage.show( "SuperUser" );
            });
    }
}

class NewUserData extends PatientDataEditMode {
    savePatientData() {
        this.loadDocData();
        this.doc[0]._id = "org.couchdb.user:"+this.doc[0].name;
        this.doc[0].type = "user";
        this.doc[0].roles = [ this.doc[0].roles ];
        User.password[this.doc[0]._id] = this.doc[0].password; // for informing user
        User.db.put( this.doc[0] )
        .then( response => {
            User.select( response.id );
            objectPage.show( "SendUser" );
            })
        .catch( err => {
            objectLog.err(err);
            objectPage.show( "UserList" );
            });
    }
}

class EditUserData extends PatientData {
    savePatientData() {
        if ( this.loadDocData()[0] ) {
            this.doc[0].roles = [ this.doc[0].roles ];
            User.password[this.doc[0]._id] = this.doc[0].password; // for informing user
            User.db.put( this.doc[0] )
            .then( () => objectPage.show( "SendUser" ) )
            .catch( err => {
                objectLog.err(err);
                objectPage.show( "UserList" );
                });
        } else if ( User.id in User.password ) {
            objectPage.show( "SendUser" );
        } else {
            // no password to send
            objectLog.err("No stored password") ;
            objectPage.show( "UserList" );
        }
    }
}

class DateMath { // convenience class
    static prettyInterval(msec) {
        let hours = msec / 1000 / 60 / 60;
        if ( hours < 24 ) {
            return `${hours.toFixed(1)} hours`;
        }
        let days = hours / 24 ;
        if ( days < 14 ) {
            return `${days.toFixed(1)} days`;
        }
        let weeks = days / 7;
        if ( weeks < 8 ) {
            return `${weeks.toFixed(1)} weeks`;
        }
        let months = days / 30.5;
        if ( months < 13 ) {
            return `${months.toFixed(1)} months`;
        }
        let years = days / 365.25;
        return `${years.toFixed(1)} years`;
    }

    static age( dob, current=null ) {
        let birthday = flatpickr.parseDate( dob, "Y-m-d") ;
        let ref = Date.now();
        if ( current ) {
            ref = flatpickr.parseDate( current, "Y-m-d") ;
        }
        return DateMath.prettyInterval( ref - birthday );
    }
}

class Patient { // convenience class
    static del() {
        if ( Patient.isSelected() ) {        
            let pdoc;
            let ndocs;
            let odocs;
            Patient.getRecordIdPix(patientId) // patient
            .then( (doc) => pdoc = doc )
            .then( _ => Note.getRecordsIdDoc(patientId) ) // notes
            .then( (docs) => ndocs = docs.row )
            .then( _ => Operation.getRecordsIdDoc(patientId) ) // operations
            .then( (docs) => {
                odocs = docs.rows;
                // Confirm question
                let c = `Delete patient \n   ${pdoc.FirstName} ${pdoc.LastName} DOB: ${pdoc.DOB}\n    `;
                if (ndocs.length == 0 ) {
                    c += "(no associated notes on this patient) \n   ";
                } else {
                    c += `also delete ${ndocs.length} associated notes\n   `;
                }
                if (odocs.length == 0 ) {
                    c += "(no associated operations on this patient) \n   ";
                } else {
                    c += `also delete ${odocs.length} associated operations\n   `;
                }
                c += "Are you sure?";
                if ( confirm(c) ) {
                    return true;
                } else {
                    throw "No delete";
                }           
                })
            .then( () => Promise.all(ndocs.map( (doc) => db.remove(doc.doc._id,doc.doc._rev) ) ) )
            .then( () => Promise.all(odocs.map( (doc) => db.remove(doc.doc._id,doc.doc._rev) ) ) )
            .then( () => db.remove(pdoc) )
            .then( () => Patient.unselect() )
            .catch( (err) => objectLog.err(err) ) 
            .finally( () => objectPage.show( "AllPatients" ) );
        }
    }

    static getRecordId(id=patientId ) {
        return db.get( id );
    }

    static getRecordIdPix(id=patientId ) {
        return db.get( id, { attachments:true, binary:true } );
    }

    static getAllId() {
        let doc = {
            startkey: Id_patient.allStart(),
            endkey: Id_patient.allEnd(),
        };

        return db.allDocs(doc);
    }
        
    static getAllIdDoc() {
        let doc = {
            startkey: Id_patient.allStart(),
            endkey: Id_patient.allEnd(),
            include_docs: true,
        };

        return db.allDocs(doc);
    }
        
    static getAllIdDocPix() {
        let doc = {
            startkey: Id_patient.allStart(),
            endkey: Id_patient.allEnd(),
            include_docs: true,
            binary: true,
            attachments: true,
        };

        return db.allDocs(doc);
    }

    static select( pid = patientId ) {
        if ( patientId != pid ) {
            // change patient -- notes dont apply
            Note.unselect();
            objectNoteList.category = 'Uncategorized' ;
        }

        patientId = pid ;
        if ( pid == missionId ) {
            Mission.select() ;
        } else {
            Cookie.set( "patientId", pid );
            // Check patient existence
            db.query("Pid2Name",{key:pid})
            .then( (doc) => {
                document.getElementById( "titlebox" ).innerHTML = doc.rows[0].value[1];
                })
            .catch( (err) => {
                objectLog.err(err,"patient select");
                Patient.unselect();
                });
        }
    }

    static isSelected() {
        return ( patientId != null ) && ( patientId != missionId ) ;
    }

    static unselect() {
        patientId = null;
        Cookie.del ( "patientId" );
        Note.unselect();
        objectNoteList.category = 'Uncategorized' ;
        Operation.unselect();
        document.getElementById( "titlebox" ).innerHTML = "";
    }
}

class Note { // convenience class
    static getAllIdDoc() {
        let doc = {
            startkey: Id_note.allStart(),
            endkey: Id_note.allEnd(),
            include_docs: true,
            binary: false,
            attachments: false,
        };
        return db.allDocs(doc);
    }

    static getRecordsId(pid=patientId) {
        let doc = {
            startkey: Id_note.patStart(pid),
            endkey: Id_note.patEnd(pid),
        };
        return db.allDocs(doc) ;
    }

    static getRecordsIdDoc(pid=patientId) {
        let doc = {
            startkey: Id_note.patStart(pid),
            endkey: Id_note.patEnd(pid),
            include_docs: true,
        };
        return db.allDocs(doc) ;
    }

    static getRecordsIdPix(pid=patientId) {
        let doc = {
            startkey: Id_note.patStart(pid),
            endkey: Id_note.patEnd(pid),
            include_docs: true,
            binary: true,
            attachments: true,
        };
        return db.allDocs(doc) ;
    }

    static dateFromDoc( doc ) {
        return ((doc["date"] ?? "") + Id_note.splitId(doc._id).key).substring(0,24) ;
    }

    static select( nid=noteId ) {
        // Check patient existence
        db.get(nid)
        .then( doc => {
            if ( doc.patient_id != patientId ) {
                Patient.select( doc.patient_id);
            }
            Cookie.set( "noteId", nid );
            })
        .catch( err => objectLog.err(err,"note select"));
    }

    static unselect() {
        Cookie.del ( "noteId" );
    }

}

class Operation { // convenience class
    static select( oid=operationId ) {
        // Check patient existence
        operationId=oid ;
        db.get(oid)
        .then( doc => {
            if ( doc.patient_id != patientId ) {
                Patient.select( doc.patient_id);
            }
            Cookie.set ( "operationId", oid  );
            })
        .catch( err => {
            objectLog.err(err,"operation select");
            Operation.unselect();
            });             
    }

    static unselect() {
        operationId = null;
        Cookie.del( "operationId" );
    }

    static create() {
        let doc = {
            _id: Id_operation.makeId(),
            author: remoteCouch.username,
            type: "operation",
            Procedure: "Enter new procedure",
            Surgeon: "",
            "Date-Time": "",
            Duration: "",
            Laterality: "?",
            Status: "none",
            Equipment: "",
            patient_id: patientId,
        };
        return db.put( doc );
    }

    static del() {
        if ( operationId ) {
            let pdoc;
            Patient.getRecordId()
            .then( (doc) => { 
                pdoc = doc;
                return db.get( operationId );
                })
            .then( (doc) => {
                if ( confirm(`Delete operation <${doc.Procedure}>\n on patient ${pdoc.FirstName} ${pdoc.LastName} DOB: ${pdoc.DOB}.\n -- Are you sure?`) ) {
                    return doc;
                } else {
                    throw "No delete";
                }           
                })
            .then( (doc) =>db.remove(doc) )
            .then( () => Operation.unselect() )
            .catch( (err) => objectLog.err(err) )
        }
        return true;
    }    
        
    static getAllIdDoc() {
        let doc = {
            startkey: Id_operation.allStart(),
            endkey: Id_operation.allEnd(),
            include_docs: true,
        };
        return db.allDocs(doc);
    }

    static getAllIdDocCurated() {
        // only real cases or placeholder if no others for that paitent
        return Operation.getAllIdDoc()
        .then( doclist => { 
            const pids = new Set() ;
            doclist.rows
            .filter( r => r.doc.Procedure !== "Enter new procedure" )
            .forEach( r => pids.add( r.doc.patient_id ) ) ;
            return doclist.rows
                   .filter( r => (r.doc.Procedure !== "Enter new procedure") || !pids.has( r.doc.patient_id ) ) ;
            });
    }

    static getRecordsId(pid=patientId) {
        let doc = {
            startkey: Id_operation.patStart(pid),
            endkey: Id_operation.patEnd(pid),
            include_docs: true,
        };
        return db.allDocs(doc) ;
    }
    static getRecordsIdDoc( pid=patientId ) {
        let doc = {
            startkey: Id_operation.patStart(pid),
            endkey: Id_operation.patEnd(pid),
            include_docs: true,
        };

        // Adds a single "blank"
        // also purges excess "blanks"
        return db.allDocs(doc)
        .then( (doclist) => {
            let newlist = doclist.rows
                .filter( (row) => ( row.doc.Status === "none" ) && ( row.doc.Procedure === "Enter new procedure" ) )
                .map( row => row.doc );
            switch ( newlist.length ) {
                case 0 :
                    throw null;
                case 1 :
                    return Promise.resolve( doclist );
                default:
                    throw newlist.slice(1);
                }
            })
        .catch( (dlist) => {
            if ( dlist == null ) {
                // needs an empty
                throw null;
            }
            // too many empties
            return Promise.all(dlist.map( (doc) => db.remove(doc) ))
                .then( ()=> Operation.getRecordsIdDoc( pid )
                );
            })
        .catch( () => {
            return Operation.create().then( () => db.allDocs(doc) );
            });
    }

    static dateFromDoc( doc ) {
        return ((doc["Date-Time"] ?? "") + Id_operation.splitId(doc._id).key).substring(0,24) ;
    }
}

class User { // convenience class
    static db = null ; // the special user couchdb database for access control
    static id = null; // not cookie backed
    static password = {}; // userid/password pairs from this session since you can't get them back from the database (encrypted)
    static del() {
        if ( User.id ) {
            User.db.get( User.id )
            .then( (doc) => {
                if ( confirm(`Delete user ${doc.name}.\n -- Are you sure?`) ) {
                    return User.db.remove(doc) ;
                } else {
                    throw "No delete";
                }
                })              
            .then( () => User.unselect() )
            .catch( (err) => objectLog.err(err) )
            .finally( () => objectPage.show( "UserList" ) );
        }
        return true;
    }    
    
    static select( uid ) {
        User.id = uid;
        if ( objectPage.test("UserList") ) {
            objectTable.highlight();
        }
        document.getElementById("editreviewuser").disabled = false;
    }    

    static unselect() {
        User.id = null;
        document.getElementById("editreviewuser").disabled = true;
    }

    static getAllIdDoc() {
        let doc = {
            startkey: "org.couchdb.user:",
            endkey: "org.couchdb.user:\\fff0",
            include_docs: true,
            binary: true,
            attachments: true,
        } ;
        return User.db.allDocs(doc);
    }

    static send( doc ) {
        document.getElementById("SendUserMail").href = "";
        document.getElementById("SendUserPrint").onclick=null;
        let url = new URL( window.location.href );
        url.searchParams.append( "address", remoteCouch.address );
        url.searchParams.append( "database", remoteCouch.database );
        url.searchParams.append( "password", User.password[User.id] );
        url.searchParams.append( "username", doc.name );
        new QR(
            document.getElementById("SendUserQR"),
            url.href,
            200,200,
            4);
        document.getElementById("SendUserEmail").value = doc.email;
        document.getElementById("SendUserLink").value = url.href;

        let bodytext=
`Welcome, ${doc.name}, to eMission.

  eMission: software for managing medical missions
      in resource-poor environments.
      https://emissionsystems.org

You have an account:

  web address: ${remoteCouch.address}
     username: ${doc.name}
     password: ${User.password[User.id]}
     database: ${remoteCouch.database}

Full link (paste into your browser address bar):
  ${url.href}

We are looking forward to your participation.
`
        ;

        let mail_url = new URL( "mailto:" + doc.email );
        mail_url.searchParams.append( "subject", "Welcome to eMission" );
        mail_url.searchParams.append( "body", bodytext );
        document.getElementById("SendUserMail").href = mail_url.href;
        document.getElementById("SendUserPrint").onclick=()=>User.printCard(url,bodytext);
    }

    static printCard(url,bodytext="") {
        let card = document.getElementById("printUser");
        card.querySelector("#printUserText").innerText=bodytext;
        new QR(
            card.querySelector(".qrUser"),
            url.href,
            300,300,
            4);

        objectPage.show_screen( "user" ) ;
        window.print();
        objectPage.show("SendUser");
    }
}

class Mission { // convenience class
    static select() {
        Patient.unselect();
        patientId = missionId;
        Mission.getRecordId()
        .then( doc => document.getElementById( "titlebox" ).innerHTML = doc.Name ) ;
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

class RemoteReplicant { // convenience class
    constructor( qline ) {
        this.remoteFields = [ "address", "username", "password", "database" ];
        this.remoteDB = null;
        this.problem = false ;
        this.synctext = document.getElementById("syncstatus");
        
        // Get remote DB from cookies if available
        if ( Cookie.get( "remoteCouch" ) == null ) {
            remoteCouch = {
                database: "", // must be set to continue
                username: "",
                password: "",
                address: "",
                };
        }

        // Get Remote DB fron command line if available
        if ( this.remoteFields.every( k => k in qline ) ) {
            let updateCouch = false ;
            this.remoteFields.forEach( f => {
                const q = qline[f] ;
                if ( remoteCouch[f] != q ) {
                    updateCouch = true ;
                    remoteCouch[f] = q ;
                }
                });
            // Changed, so reset page
            if ( updateCouch ) {
                objectPage.reset() ;               
                Cookie.set( "remoteCouch", remoteCouch );
            }
        }
        
        window.addEventListener("offline", _ => this.status( "disconnect", "--network offline--" ) );
        window.addEventListener("online", _ => this.status( this.problem?"problem":"good", "--network present--" ) );
        navigator.onLine ? 
            this.status( "good", "--network present--" ) 
            : this.status( "disconnect", "--network offline--" ) ;
    }

    // Initialise a sync process with the remote server
    foreverSync() {
        this.remoteDB = this.openRemoteDB( remoteCouch ); // null initially
        document.getElementById( "userstatus" ).value = remoteCouch.username;
        if ( this.remoteDB ) {
            this.status( "good","download remote database");
            db.replicate.from( this.remoteDB )
                .catch( (err) => this.status("problem",`Replication from remote error ${err.message}`) )
                .finally( _ => this.syncer() );
        } else {
            this.status("problem","No remote database specified!");
        }
    }
    
    syncer() {
        this.status("good","Starting database intermittent sync");
        db.sync( this.remoteDB ,
            {
                live: true,
                retry: true,
                filter: (doc) => doc._id.indexOf('_design') !== 0,
            } )
            .on('change', ()       => this.status( "good", "changed" ))
            .on('paused', ()       => this.status( "good", "quiescent" ))
            .on('active', ()       => this.status( "good", "actively syncing" ))
            .on('denied', (err)    => this.status( "problem", "Credentials or database incorrect" ))
            .on('complete', ()     => this.status( "good", "sync stopped" ))
            .on('error', (err)     => this.status( "problem", `Sync problem: ${err.reason}` ));
    }
    
    status( state, msg ) {
        switch (state) {
            case "disconnect":
                document.body.style.background="#8ed191"; // grey
                if ( this.lastState !== state ) {
                    objectLog.err(msg,"Network status");
                }
                break ;
            case "problem":
                document.body.style.background="#d72e18"; // orange
                objectLog.err(msg,"Network status");
                this.problem = true ;
                break ;
            case "good":
            default:
                document.body.style.background="#19a720"; // heppy green
                if ( this.lastState !== state ) {
                    objectLog.err(msg,"Network status");
                }
                this.problem = false ;
                break ;
        }
        this.synctext.value = msg ;
    }
            
    openRemoteDB( DBstruct ) {
        if ( DBstruct && this.remoteFields.every( k => k in DBstruct )  ) {
            return new PouchDB( [DBstruct.address, DBstruct.database].join("/") , {
                "skip_setup": "true",
                "auth": {
                    "username": DBstruct.username,
                    "password": DBstruct.password,
                    },
                });
        } else {
            objectLog.err("Bad DB");
            return null;
        }
    }
            
    closeRemoteDB() {
        return Promise.all( [
            User.db ? User.db.close() : Promise.resolve(true),
            security_db ? security_db.close() : Promise.resolve(true),
            ]);
    }

    // Fauxton link
    link() {
        window.open( `${remoteCouch.address}/_utils`, '_blank' );
    }

    SecureURLparse( url ) {
        let prot = "https";
        let addr = url;
        let port = "6984";
        let spl = url.split("://") ;
        if (spl.length < 2 ) {
            addr=spl[0];
        } else {
            prot = spl[0];
            addr = spl[1];
        }
        spl = addr.split(":");
        if (spl.length < 2 ) {
            addr=spl[0];
        } else {
            addr = spl[0];
            port = spl[1];
        }
        return [prot,[addr,port].join(":")].join("://");
    }
}

class Cookie { //convenience class
    static set( cname, value ) {
      // From https://www.tabnine.com/academy/javascript/how-to-set-cookies-javascript/
        window[cname] = value;
        let date = new Date();
        date.setTime(date.getTime() + (400 * 24 * 60 * 60 * 1000)); // > 1year
        document.cookie = `${cname}=${encodeURIComponent(JSON.stringify(value))}; expires=${date.toUTCString()}; SameSite=None; Secure; path=/`;
    }

    static del( cname ) {
        window[cname] = null;
        document.cookie = cname +  "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    }

    static get( cname ) {
        const name = `${cname}=`;
        let ret = null;
        decodeURIComponent(document.cookie).split('; ').filter( val => val.indexOf(name) === 0 ).forEach( val => {
            try {
                ret = JSON.parse( val.substring(name.length) );
                }
            catch(err) {
                ret =  val.substring(name.length);
                }
        });
        window[cname] = ret;
        return ret;
    }

}

class Page { // singleton class
    constructor() {
        // get page history from cookies
        // much simplified from app.js -- no checking of entries or history
        // since any unrecognized entries send us back to app.js
        this.path = Cookie.get( "displayState" );
    }
    
    reset() {
        // resets to just MainMenu
        this.path = [ "MainMenu" ] ;
        Cookie.set ( "displayState", this.path ) ;
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
            Cookie.set ( "displayState", this.path ) ;
        }
    }

    test( page ) {
        return this.current()==page ;
    }

    forget() {
        this.back();
    }

    link() {
        window.open( `https://emissionsystem.org/help/${this.current()}.md`, '_blank' );
    } 
    
    show( state = "AllPatients", extra="" ) { // main routine for displaying different "pages" by hiding different elements
        if ( db == null || remoteCouch.database=='' ) {
            this.show("FirstTime");
        }

        this.next(state) ; // update reversal list

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
        document.getElementById("splash_screen").style.display = "none";
        let showscreen = {
            ".work_screen": type=="screen",
            ".print_patient": type == "patient",
            ".print_user": type == "user",
        };
        for ( let cl in showscreen ) {
            document.querySelectorAll(cl)
            .forEach( (v)=> v.style.display=showscreen[cl]?"block":"none"
            );
        }
    }    

    static setButtons() {
        // Add Extra buttons
        document.querySelector("#moreTop").querySelectorAll("button")
        .forEach( b => document.querySelectorAll(".topButtons").forEach(t=>t.appendChild(b.cloneNode(true))) );

        // set Help buttons
        document.querySelectorAll(".Qmark").forEach( h => {
            h.title = "Open explanation in another tab" ;
            h.addEventListener("click",()=>objectPage.link());
            });

        // set edit details for PatientData edit pages -- only for "top" portion
        document.querySelectorAll(".edit_data").forEach( e => {
            e.title = "Unlock record to allow changes" ;
            e.addEventListener("click",()=>objectPatientData.clickEdit());
            });

        // set save details for PatientData save pages
        document.querySelectorAll(".savedata").forEach( s => {
            s.title = "Save your changes to this record" ;
            s.addEventListener("click",()=>objectPatientData.savePatientData());
            });
        // remove redundant mission buttons
        [...document.querySelectorAll(".topButtons")]
        .filter(d => d.querySelector(".missionLogo"))
        .forEach( d => d.removeChild(d.querySelector(".missionButton")));
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

class DBTable extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        objectTable = new DatabaseTable();
        Collation.getAllIdDoc()
        .then( (docs) => {
            objectTable.fill(docs.rows) ;
            })
        .catch( (err) => objectLog.err(err) );
    }
}

class ErrorLog extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        objectLog.show() ;
    }
}

class SendUser extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        if ( User.db == null ) {
            objectPage.show( "SuperUser" );
        } else if ( User.id == null || !(User.id in User.password) ) {
            objectPage.show( "UserList" );
        } else {
            User.db.get( User.id )
            .then( doc => User.send( doc ) )
            .catch( err => {
                objectLog.err(err);
                objectPage.show( "UserList" );
                });
        }
    }
}

class SuperUser extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        remoteUser.address = remoteCouch.address;
        objectPatientData = new SuperUserData( Object.assign({},remoteUser), structSuperUser );
    }
}

class UserEdit extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        if ( User.db == null ) {
            objectPage.show( "SuperUser" );
        } else if ( User.id == null ) {
            objectPage.show( "UserList" );
        } else {
            User.db.get( User.id )
            .then( doc => {
                doc.roles = doc.roles[0]; // unarray
                objectPatientData = new EditUserData( doc, structEditUser );
                })
            .catch( err => {
                objectLog.err(err);
                User.unselect();
                objectPage.show( "UserList" );
                });
        }
    }
}

class UserList extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        if ( User.db == null ) {
            objectPage.show( "SuperUser" );
        } else {
            objectTable = new UserTable();
            User.getAllIdDoc()
            .then( docs => objectTable.fill(docs.rows ) )
            .catch( (err) => {
                objectLog.err(err);
                objectPage.show ( "SuperUser" );
                });
        }
    }
}

class UserNew extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        if ( User.db == null ) {
            objectPage.show( "SuperUser" );
        } else {
            User.unselect();
            objectPatientData = new NewUserData( {}, structNewUser );
        }
    }
}

class PatientMerge extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    
	static gotMessage(e) {
		console.log(e.data,e.origin,e.lastEventId);
		switch ( e.data?.frame ) {
			case 'from':
				document.getElementById('fromlabel').innerText=e.data.pid;
				break;
			case 'to':
				document.getElementById('tolabel').innerText=e.data.pid;
				break;
			}
	}

    static subshow(extra="") {
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
		document.getElementById('fromlabel').innerText="from";
		document.getElementById('tolabel').innerText="to";
		window.removeEventListener('message',this.gotMessage);
	}
}

function isAndroid() {
    return navigator.userAgent.toLowerCase().indexOf("android") > -1;
}

class SortTable {
    constructor( collist, tableId, aliaslist=[] ) {
        this.tbl = document.getElementById(tableId);
        this.tbl.innerHTML = "";
        this.collist = collist;
        
        // alias-list is a list in form (list of lists):
        //[ [fieldname, aliasname, transformfunction],...]
        
        this.aliases={}; // Eventually will have an alias and function for all columns, either default, or specified
        this.collist.forEach( f => this.aliasAdd(f) ) ; // default aliases
        aliaslist.forEach( a => this.aliasAdd(a[0],a[1],a[2]) );

        // Table Head
        let header = this.tbl.createTHead();
        let row = header.insertRow(0);
        row.classList.add('head');
        this.collist.forEach( (f,i) => row.insertCell(i).outerHTML=`<th>${this.aliases[f].name}</th>` );

        // Table Body
        let tbody = document.createElement('tbody');
        this.tbl.appendChild(tbody);

        this.dir = 1;
        this.lastth = -1;
        this.tbl.onclick = this.allClick.bind(this);
    }

    aliasAdd( fieldname, aliasname=null, transformfunction=null ) {
        if ( !(fieldname in this.aliases) ) {
            // Add an entry (currently empty) for this column
            this.aliases[fieldname] = {} ;
        }
        this.aliases[fieldname]["name"] = aliasname ?? fieldname ;
        this.aliases[fieldname]["value"] = ((record)=>{
            try {
                if ( transformfunction==null ) {
                    return record[fieldname];
                } else {
                    return transformfunction(record) ;
                }
            } catch(e) {
                console.log(e);
                return "";
            }
            }) ;
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
            ['click']
            .forEach( (e) => row.addEventListener( e, () => this.selectandedit( record._id ) ) ) ;
            this.collist.forEach( (colname,i) => {
                let c = row.insertCell(i);
                c.innerText=(this.aliases[colname].value)(record) ;
            });
        });
        this.highlight();
    }
    
    selectandedit( id ) {
        this.selectFunc( id );
        this.editpage() ;
    }
  
    allClick(e) {
        if (e.target.tagName == 'TH') {
            return this.sortClick(e);
        }
    }

    resort() {
        if ( this.lastth < 0 ) {
            this.lastth = 0;
            this.dir = 1;
        }
        this.sortGrid(this.lastth);
    }

    sortClick(e) {
        let th = e.target;
        if ( th.cellIndex == this.lastth ) {
            this.dir = -this.dir;
        } else {
            this.dir = 1;
            this.lastth = th.cellIndex;
        }
        // if TH, then sort
        // cellIndex is the number of th:
        //   0 for the first column
        //   1 for the second column, etc
        this.sortGrid(th.cellIndex);
    }

    sortGrid(colNum) {
        let tbody = this.tbl.querySelector('tbody');
        if ( tbody == null ) {
            // empty table
            return;
        }

        let rowsArray = Array.from(tbody.rows);

        let type = "number";
        rowsArray.some( (r) => {
            let c = r.cells[colNum].innerText;
            if ( c == "" ) {
                //empty
            } else if ( isNaN( Number(r.cells[colNum].innerText) ) ) {
                type = "string";
                return true;
            } else {
                return true;
            }
        });

        // compare(a, b) compares two rows, need for sorting
        let dir = this.dir;
        let compare;

        switch (type) {
            case 'number':
                compare = (rowA, rowB) => (rowA.cells[colNum].innerText - rowB.cells[colNum].innerText) * dir;
                break;
            case 'string':
                compare = (rowA, rowB) => rowA.cells[colNum].innerText > rowB.cells[colNum].innerText ? dir : -dir;
                break;
        }

        // sort
        rowsArray.sort(compare);

        tbody.append(...rowsArray);
        this.highlight();
    }

    highlight() {
        let Rs = Array.from(this.tbl.rows);
        Rs.forEach( r => r.classList.remove('choice'));
        let id = this.selectId();
        if ( id ) {
            let sr = Rs.filter( r => r.getAttribute('data-id')==id );
            if ( sr.length > 0 ) {
                sr.forEach( r => r.classList.add('choice'));
                sr[0].scrollIntoView();
            }
        }
    }
}

class PatientTable extends SortTable {
    constructor() {
        super( 
            ["LastName", "Procedure","Date-Time","Surgeon" ], 
            "AllPatients",
            [
                ["LastName","Name", (doc)=> `${doc.LastName}, ${doc.FirstName}`],
                ['Date-Time','Date',(doc)=>doc["Date-Time"].substring(0,10)],
            ] 
            );
    }

    selectId() {
        return patientId;
    }

    selectFunc(id) {
        Patient.select(id) ;
    }

    editpage() {
        objectPage.show("PatientPhoto");
    }
}

class DatabaseTable extends SortTable {
    constructor() {
        super( 
            ["Name","Organization","Location","StartDate"], 
            "DBTable" 
            );
        // starting databaseId
        this.databaseId = this.makeId( remoteCouch.database ) ;
        this.loadedId = this.databaseId ;
        // set titlebox
        objectCollation.db.get(this.databaseId)
        .then( (doc) => document.getElementById( "titlebox" ).innerHTML = [doc.Name,doc.Location,doc.Organization].join(" ") )
        .catch( _ => document.getElementById( "titlebox" ).innerHTML = [remoteCouch.address, remoteCouch.database].join(" ") ) ;
        this.selectFunc( this.databaseId ) ;
    }

    makeId( db ) {
        return '0'+db;
    }

    unselect() {
        this.databaseId = null;
        if ( objectPage.test("DBTable") ) {
            let pt = document.getElementById("DBTable");
            if ( pt ) {
                let rows = pt.rows;
                for ( let i = 0; i < rows.length; ++i ) {
                    rows[i].classList.remove('choice');
                }
            }
        }
    }

    selectId() {
        return this.databaseId;
    }

    selectFunc(did) {
        if ( this.databaseId != did ) {
            // change database
            this.unselect();
        }
        this.databaseId = did ;
        objectCollation.db.get(did)
        .then( (doc) => {
            this.databaseId = did;
            // highlight the list row
            if ( objectPage.test('DBTable') && objectTable ) {
                objectTable.highlight();
            }
            })
        .catch( _ => this.unselect() )
        .finally( _ => document.getElementById("switchdatabase").disabled = (this.databaseId==null) || (this.databaseId==this.loadedId) ) ;
    }

    editpage() {
        // select this database and reload
        if ( this.databaseId != this.loadedId ) {
            // changed!
            objectCollation.db.get(this.databaseId)
            .then( (doc) => {
                remoteCouch.address = doc.server ;
                remoteCouch.database = doc.dbname ;
                Cookie.set( "remoteCouch", Object.assign({},remoteCouch) ) ;
                })
            .catch( (err) => objectLog.err(err,"Loading patient database") )
            .finally( () => {
                objectPage.reset();
                location.reload(); // force reload
                }) ;
        } else {
            objectPage.show( "MainMenu" ) ;
        }        
    }
}

class UserTable extends SortTable {
    constructor() {
        super(
            ["name", "roles", "email", "type", ], 
            "UserList"
            );
    }

    selectId() {
        return User.id;
    }

    selectFunc(id) {
        User.select(id) ;
    }

    editpage() {
        objectPage.show("UserEdit");
    }
}

function cloneClass( fromClass, target ) {
    let c = document.getElementById("templates").querySelector(fromClass);
    target.innerHTML = "";
    c.childNodes.forEach( cc => target.appendChild(cc.cloneNode(true) ) );
}    

class Collation {
    constructor() {
        this.db = new PouchDB( 'databases' );
        PouchDB.replicate( 'https://emissionsystem.org:6984/databases', this.db, { live:true, retry:true } ) ;
    }

    static getAllIdDoc() {
        let doc = {
            startkey: '0',
            endkey:   '1',
            include_docs: true,
        };
        return objectCollation.db.allDocs(doc);
    }
}

class Log{
    constructor() {
        this.list = [];
    }
    
    err( err, title=null ) {
        // generic console.log of error
        let ttl = title ?? objectPage.current() ;
        let msg = err.message ?? err ;
        this.list.push(`${ttl}: ${msg}`);
        console.group() ;
        console.log( ttl, msg ) ;
        console.trace();
        console.groupEnd();
        if ( objectPage.current() == "ErrorLog" ) {
            // update
            this.show();
        }
    }
    
    clear() {
        this.list = [] ;
        this.show();
    }
    
    show() {
        let cont = document.getElementById("ErrorLogContent") ;
        cont.innerHTML="";
        let ul = document.createElement('ul');
        cont.appendChild(ul);
        this.list
        .forEach( e => {
            let l = document.createElement('li');
            l.innerText=e;
            //l.appendChild( document.createTextNode(e) ) ;
            ul.appendChild(l) ;
        });
    }
}

objectLog = new Log() ;

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

function cookies_n_query() {
    Cookie.get ( "patientId" );
    Cookie.get ( "noteId" );
    objectPage = new Page();
    Cookie.get ( "operationId" );

    
    // need to establish remote db and credentials
    // first try the search field
    const qline = parseQuery();
    objectRemote = new RemoteReplicant( qline ) ;
    
    // first try the search field
    if ( qline && ( "patientId" in qline ) ) {
        Patient.select( qline.patientId );
        objectPage.next("PatientPhoto");
    }
}

// Application starting point
window.onload = () => {
    // Stuff into history to block browser BACK button
    window.history.pushState({}, '');
    window.addEventListener('popstate', ()=>window.history.pushState({}, '') );

    // Service worker (to manage cache for off-line function)
    if ( 'serviceWorker' in navigator ) {
        navigator.serviceWorker
        .register('/sw.js')
        .catch( err => objectLog.err(err,"Service worker registration") );
    }
    
    Page.setButtons() ;

    // set state from URL or cookies
    cookies_n_query() ; // look for remoteCouch and other cookies

    // database list
    objectCollation = new Collation();

    // Start pouchdb database       
    if ( remoteCouch.database !== "" ) {
        db = new PouchDB( remoteCouch.database, {auto_compaction: true} ); // open local copy
        document.querySelectorAll(".headerboxlink")
        .forEach( q => q.addEventListener("click",()=>objectPage.show("MainMenu")));

        // start sync with remote database
        objectRemote.foreverSync();

        // set link for mission
        Mission.link();

        // now jump to proper page
        objectPage.show( null ) ;

    } else {
        db = null;
        objectPage.reset();
        objectPage.show("FirstTime");
    }

};
