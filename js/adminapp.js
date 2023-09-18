"use strict";

/* jshint esversion: 11 */

// singleton class instances
var objectPatientData;
var objectNoteList={};
    objectNoteList.category = 'Uncategorized' ;
var objectTable = null;
var objectRemote = null;
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

class RemoteSecurity {
    constructor() {
        this.database = null;
        this.username=null;
        this.address = null;
        this.password = null;
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
            address: this.address,
        } ;
    }
};

var objectSecurity = new RemoteSecurity();

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
        type: "text",
    },    
    {
        name: "address",
        alias: "Remote database server address",
        hint: "emissionsystem.org -- don't include database name",
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

    display_image() {
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
        this.display_image();
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
        this.display_image();
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
        this.display_image();
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
                    this.images[localname].display_image() ;
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
                // includes password
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
                this.images[localname].display_image();
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
                if ( struct[idx].type == "password" && postVal=="" ) {
                    // do nothing -- don't over-write password
                } else if ( struct[idx].type != "image" ) {
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
            this.doc[0].address=objectRemote.SecureURLparse(this.doc[0].address); // fix up URL
            Cookie.set ( "remoteCouch", Object.assign({},this.doc[0]) );
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
            User.user_db = objectRemote.openRemoteDB( remoteUser );

            // admin access to this database
            objectSecurity.setup( remoteUser.username, remoteUser.password ) ;
            security_db = objectRemote.openRemoteDB( objectSecurity.object() );

            objectPage.show( this.nextpage ); })
        .catch( err => {
            alert( err );
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
        User.user_db.put( this.doc[0] )
        .then( response => User.select( response.id ))
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
            this.doc[0].quad = {
                'username':this.doc[0].name,
                'password':this.doc[0].password,
                'database':remoteCouch.database,
                'address' :remoteCouch.address,
            };
            User.user_db.put( this.doc[0] )
            .then( _ => objectSecurity.setUser( this.doc[0].name, status ) )
            .then( _ => objectPage.show( "SendUser" ) )
            .catch( err => {
                objectLog.err(err);
                objectPage.show( "UserList" );
                });
        } else if ( quad in this.doc[0] ) {
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
}



class Operation { // convenience class
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
    
    static nullOp( doc ) {
        return doc.Procedure == "Enter new procedure" ;
    }

    static getAllIdDoc() {
        let doc = {
            startkey: Id_operation.allStart(),
            endkey: Id_operation.allEnd(),
            include_docs: true,
        };
        return db.allDocs(doc);
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
                .filter( (row) => ( row.doc.Status === "none" ) && Operation.nullOp( row.doc ) )
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
    static user_db = null ; // the special user couchdb database for access control
    static id = null; // not cookie backed
    static del() {
        if ( User.id ) {
            User.user_db.get( User.id )
            .then( (doc) => {
                if ( confirm(`Delete user ${doc.name}.\n -- Are you sure?`) ) {
                    return User.user_db.remove(doc) ;
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
    }    

    static unselect() {
        User.id = null;
    }

    static getAllIdDoc() {
        let doc = {
            include_docs: true,
        } ;
        return User.user_db.allDocs(doc);
    }
    
    static simple_url() {
        let url = new URL( "/index.html", window.location.href ) ;
        if ( url.hostname == 'localhost' ) {
            url = new URL( "/index.html", remoteCouch.address ) ;
            url.port = '';
        }
        return url
    }

    static make_url( user_dict ) {
        let url = User.simple_url() ;
        url.searchParams.append( "address", user_dict.address );
        url.searchParams.append( "database", user_dict.database );
        url.searchParams.append( "password", user_dict.password );
        url.searchParams.append( "username", user_dict.username );
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
            let url = User.make_url(doc.quad);
            new QR(
                document.getElementById("SendUserQR"),
                url.toString(),
                200,200,
                4);
            document.getElementById("SendUserEmail").value = doc.email;
            document.getElementById("SendUserLink").value = url.toString();

            let mail_url = new URL( "mailto:" + doc.email );
            mail_url.searchParams.append( "subject", "Welcome to eMission" );
            mail_url.searchParams.append( "body", User.bodytext(doc.quad) );
            document.getElementById("SendUserMail").href = mail_url.toString();
            document.getElementById("SendUserPrint").onclick=()=>User.printUserCard(doc.quad,"SendUser");
        }
    }

    static printUserCard(user_dict,nextpage) {
        let card = document.getElementById("printUser");
        let url = User.make_url(user_dict);
        card.querySelector("#printUserText").innerText=User.bodytext( user_dict ) ;
        new QR(
            card.querySelector(".qrUser"),
            url.toString(),
            300,300,
            4);

        objectPage.show_screen( "user" ) ;
    }
}

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

class RemoteReplicant { // convenience class
    constructor() {
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
                document.body.style.background="#d72e18"; // grey
                if ( this.lastState !== state ) {
                    objectLog.err(msg,"Network status");
                }
                break ;
            case "problem":
                document.body.style.background="#7071d3"; // Orange
                objectLog.err(msg,"Network status");
                this.problem = true ;
                break ;
            case "good":
            default:
                document.body.style.background="#172bae"; // happy blue
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
            objectLog.err("Bad DB specficication");
            return null;
        }
    }
            
    closeRemoteDB() {
        return Promise.all( [
            User.user_db ? User.user_db.close() : Promise.resolve(true),
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
        this.lastscreen = null ; // splash/screen/patient for show_screen
        if ( this.path == null ) {
            this.reset() ;
        }
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
        window.open( new URL(`/book/${this.current()}.html`,location.href).toString(), '_blank' );
    } 
    
    show( state = "Administration", extra="" ) { // main routine for displaying different "pages" by hiding different elements
        if ( db == null || remoteCouch.database=='' ) {
            if ( state != "RemoteDatabaseInput" ) {
                this.show("RemoteDatabaseInput");
            }
        }

                console.log(state);
        this.next(state) ; // update reversal list
                console.log(state);

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

class RemoteDatabaseInput extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        objectPatientData = new DatabaseData( Object.assign({},remoteCouch), structDatabase );
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
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        if ( User.user_db == null ) {
            objectPage.show( "SuperUser","MissionMembers" );
        } else {
            let rows = [] ;
            objectTable = new MissionMembersTable();
            User.getAllIdDoc()
            .then( docs => rows = docs.rows )
            .then( _ => objectSecurity.getUsers() )
            .then( sec => rows.forEach( row => row.doc.mission = 
                ["members","admins"]
                .filter( role => sec[role].names && sec[role].names.includes(row.doc.name))
                .map( r => r.slice(0,-1) )
                ))
            .then( _ => objectTable.fill(rows ) )
            .catch( (err) => {
                objectLog.err(err);
                objectPage.show ( "SuperUser","MissionMembers" );
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
            .then( _ => Note.getRecordsId( PatientMerge.transfer.from ) )
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
            .then( _ => Operation.getRecordsId( PatientMerge.transfer.from ) )
            .then( olist => Promise.all( olist.rows.map( r => 
                // convert operations to new id and delete old
                db.get(r.id,{attachments:true})
                .then(doc => {
                    if ( Operation.nullOp(doc) ) {
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

class PrintYourself extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="MainMenu") {
        User.printUserCard(remoteCouch,extra);
    }
}

class SendUser extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        if ( User.user_db == null ) {
            objectPage.show( "SuperUser","SendUser" );
        } else if ( User.id == null ) {
            objectPage.show( "UserList" );
        } else {
            User.user_db.get( User.id )
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

    static subshow(extra="UserList") {
        remoteUser.address = remoteCouch.address;
        objectPatientData = new SuperUserData( extra, Object.assign({},remoteUser), structSuperUser );
    }
}

class UserEdit extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        if ( User.user_db == null ) {
            objectPage.show( "SuperUser","UserEdit" );
        } else if ( User.id == null ) {
            objectPage.show( "UserList" );
        } else {
            let sec=null;
            objectSecurity.getUsers()
            .then( s => sec=s )
            .then( _ => User.user_db.get( User.id ) )
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
        if ( User.user_db == null ) {
            objectPage.show( "SuperUser","UserList" );
        } else {
            let rows = [] ;
            objectTable = new UserTable();
            User.getAllIdDoc()
            .then( docs => rows = docs.rows )
            .then( _=> rows.forEach( r => r.doc.mission = "-none-" ) )
            .then( _ => objectSecurity.getUsers() )
            .then( sec => ["members","admins"].forEach(role=> rows.forEach( row => {
               if ( sec[role].names && sec[role].names.includes(row.doc.name) ) { row.doc.mission = role.slice(0,-1); } 
                })))
            .then( _ => objectTable.fill(rows ) )
            .catch( (err) => {
                objectLog.err(err);
                objectPage.show ( "SuperUser","UserList" );
                });
        }
    }
}

class UserNew extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        if ( User.user_db == null ) {
            objectPage.show( "SuperUser","UserNew" );
        } else {
            User.unselect();
            objectPatientData = new NewUserData( {status:["member"]}, structNewUser );
        }
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
                c.innerHTML=(this.aliases[colname].value)(record) ;
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

class UserTable extends SortTable {
    constructor() {
        super(
            ["name", "mission", "email", ], 
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

function TitleBox( titlearray=null, show="PatientPhoto" ) {
    if ( titlearray == null ) {
        document.getElementById( "titlebox" ).innerHTML = "" ;
    } else {
        document.getElementById( "titlebox" ).innerHTML = `<button type="button" onClick='objectPage.show("${show}")'>${titlearray.join(" ")}</button>` ;
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

function cookies_n_query() {
    objectPage = new Page();
    
    // need to establish remote db and credentials
    // first try the search field
    const qline = parseQuery();
    
    if ( Object.keys(qline).length > 0 ) {
        // non-empty search field -- send back to index.html
        let u = new URL(window.location.href) ;
        u.pathname = "/index.html" ;
        window.location.href = u.toString()
    }
    objectRemote = new RemoteReplicant() ;
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

    // Start pouchdb database       
    if ( remoteCouch.database !== "" ) {
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
