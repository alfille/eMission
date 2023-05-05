"use strict";

/* jshint esversion: 6 */

// singleton class instances
var objectPatientData;
var objectNoteList={};
    objectNoteList.category = 'Uncategorized' ;
var objectTable = null;
var objectSearch = null;
var objectRemote = null;
var objectCollation = null;

// globals cookie backed
var objectPage ;
var patientId;
var noteId;
var operationId;
var remoteCouch;
var NoPhoto = "style/NoPhoto.png";
var DCTOHClogo = "style/DCTOHC11.jpg";

// Database handles and  
var db ; // will be Pouchdb local copy 
var security_db = null ;
const remoteUser = {
    database: "_users" ,
    username: "admin",
    password: "", // set in SuperUser
    address: "", // set in SuperUser
    };
const remoteSecurity = {
    database: "" , // set in SuperUser
    username: "", // set in SuperUser
    password: "", // set in SuperUser
    address: "", // set in SuperUser
    };

// used for record keys ( see makeId, etc )
const RecordFormat = {
    type: {
        patient: "p" ,
        operation: "o" ,
        note: "c" ,
        mission: "m",
        } ,
    version: 0,
};

var missionId = [
        RecordFormat.type.mission,
        RecordFormat.version,
        "",
        "",
        "", 
        ].join(";");

// used to generate data entry pages "PatientData" type
const structNewPatient = [
    {
        name: "LastName",
        hint: "Late name of patient",
        type: "text",
    },
    {
        name: "FirstName",
        hint: "First name of patient",
        type: "text",
    },
    {
        name: "DOB",
        hint: "Date of birth (as close as possible)",
        type: "date",
    },
];
    
const structDemographics = [
    {
        name: "Photo",
        hint: "PatientPhoto",
        type: "image",
        none: NoPhoto,
    },
    {
        name: "LastName",
        hint: "Late name of patient",
        type: "text",
    },
    {
        name: "FirstName",
        hint: "First name of patient",
        type: "text",
    },
    {
        name: "DOB",
        hint: "Date of Birth",
        type: "date",
    },
    {
        name: "email",
        hint: "email address",
        type: "email",
    },
    {
        name: "phone",
        hint: "Contact phone number",
        type: "tel",
    },
    {
        name: "Address",
        hint: "Patient home address",
        type: "textarea",
    },
    {
        name: "Contact",
        hint: "Additional contact information (family member, local address,...)",
        type: "textarea",
    },
];

const structMedical = [
    {
        name: "Dx",
        hint: "Diagnosis",
        type: "textarea",
    } , 
    {
        name: "Sex",
        hint: "Patient gender",
        type: "radio",
        choices: ["?","M","F","X"],
    },
    {
        name: "Weight",
        hint: "Patient weight (kg)",
        type: "number",
    },
    {
        name: "Height",
        hint: "Patient height (cm?)",
        type: "number",
    },
    {
        name: "ASA",
        hint: "ASA classification",
        type: "radio",
        choices: ["I","II","III","IV"],
    },
    {
        name: "Allergies",
        hint: "Allergies and intolerances",
        type: "textarea",
    },
    {
        name: "Meds",
        hint: "Medicine and antibiotics",
        type: "textarea",
    },
];

const structOperation = [
    {
        name: "Complaint",
        hint: "Main complaint (patient's view of the problem)",
        type: "textarea",
    },
    {
        name: "Procedure",
        hint: "Surgical operation / procedure",
        type: "list",
        query: "byProcedure"
    },
    {
        name: "Surgeon",
        hint: "Surgeon(s) involved",
        type: "list",
        query: "bySurgeon"
    },
    {
        name: "Equipment",
        hint: "Special equipment",
        type: "list",
        query: "byEquipment"
    },
    {
        name: "Status",
        hint: "Status of operation planning",
        type: "radio",
        choices: ["none","unscheduled", "scheduled", "finished", "postponed", "cancelled"],
    },
    {
        name: "Date-Time",
        hint: "Scheduled date",
        type: "datetime",
    },
    {
        name: "Duration",
        hint: "Case length",
        type: "length",
    },
    {
        name: "Laterality",
        hint: "Is there a sidedness to the case?",
        type: "radio",
        choices: ["?", "L", "R", "L+R", "N/A"],
    },
];

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
        hint: 'Name of patient information database (e.g. "mdb"',
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

const structMission = [
    {
        name: "Logo",
        hint: "logo for this organization/mission -- ~150x50 pixels",
        type: "image",
        none: DCTOHClogo,
    } , 
    {
        name: "Organization",
        hint: "Mission organization",
        type: "text",
    } , 
    {
        name: "Mission",
        hint: "Mission Name",
        type: "text",
    },
    {
        name: "Link",
        hint: "Web page of organization or mission",
        type: "url",
    } , 
    {
        name: "Location",
        hint: "Where is the mission?",
        type: "text",
    },
    {
        name: "StartDate",
        hint: "First day of mission",
        type: "date",
    },
    {
        name: "EndDate",
        hint: "Last day of mission",
        type: "date",
    },
    {
        name: "LocalContact",
        hint: "Who and how to contact local facility",
        type: "textarea",
    },
    {
        name: "Energency",
        hint: "Emergency contact",
        type: "textarea",
    },
];

// Create pouchdb indexes.
// Used for links between records and getting list of choices
// change version number to force a new version
function createQueries() {
    let ddoclist = [
    {
        _id: "_design/bySurgeon" ,
        version: 2,
        views: {
            bySurgeon: {
                map: function( doc ) {
                    if ( doc.type=="operation" ) {
                        emit( doc.Surgeon );
                    }
                }.toString(),
                reduce: '_count',
            },
        },
    },
    {
        _id: "_design/byEquipment" ,
        version: 2,
        views: {
            byEquipment: {
                map: function( doc ) {
                    if ( doc.type=="operation" ) {
                        emit( doc.Equipment );
                    }
                }.toString(),
                reduce: '_count',
            },
        },
    },
    { 
        _id: "_design/byProcedure" ,
        version: 2,
        views: {
            byProcedure: {
                map: function( doc ) {
                    if ( doc.type=="operation" ) {
                        emit( doc.Procedure );
                    }
                }.toString(),
                reduce: '_count',
            },
        },
    }, 
    {
        _id: "_design/Doc2Pid" ,
        version: 0,
        views: {
            Doc2Pid: {
                map: function( doc ) {
                    if ( doc.type=="patient" || doc.type=="mission" ) {
                        emit( doc._id,doc._id );
                    } else {
                        emit( doc._id,doc.patient_id );
                    }
                }.toString(),
            },
        },
    }, 
    {
        _id: "_design/Pid2Name" ,
        version: 2,
        views: {
            Pid2Name: {
                map: function( doc ) {
                    if ( doc.type=="patient" ) {
                        emit( doc._id, [
                            `${doc.FirstName} ${doc.LastName}`,
                            `Patient: <B>${doc.FirstName} ${doc.LastName}</B> DOB: <B>${doc.DOB}</B>`
                            ]);
                    } else if ( doc.type=="mission" ) {
                        emit( doc._id, [
                            `${doc.Organization} ${doc.Name}`,
                            `Mission: <B>${doc.Organization??""}: ${doc.Name??""}</B> to <B>${doc.Location??"?"}</B> on <B>${[doc.StartDate,doc.EndDate].join("-")}</B>`
                            ]);
                    }
                }.toString(),
            },
        },
    }, 
    ];
    Promise.all( ddoclist.map( (ddoc) => {
        db.get( ddoc._id )
        .then( doc => {
            if ( ddoc.version !== doc.version ) {
                ddoc._rev = doc._rev;
                return db.put( ddoc );
            } else {
                return Promise.resolve(true);
            }
            })
        .catch( () => {
            // assume because this is first time and cannot "get"
            return db.put( ddoc );
            });
        }))
    .catch( (err) => Page.err(err) );
}

class Search { // singleton class
    constructor() {
        this.index={};
        this.fieldlist={
            note: ["text","title",],
            operation: ["Procedure","Complaint","Surgeon","Equipment"],
            patient: ["Dx","LastName","FirstName","email","address","contact","Allergies","Meds",],
            mission: ["Mission","Organization","Link","Location","LocalContact",],
        };
        this.types = Object.keys(this.fieldlist);
        this.types.forEach( ty => this.makeIndex(ty) ) ;
        this.result=[];
        this.select_id = null ;
    }

    makeIndex(type) {
        let fl = this.fieldlist[type] ;
        this.index[type] = elasticlunr( function() {
            this.setRef("_id");
            fl.forEach( f => this.addField(f) ) ;
        }) ;
    }

    addDoc( doc ) {
        if ( doc?.type in this.fieldlist ) {
            this.index[doc.type].addDoc(
                this.fieldlist[doc.type]
                .concat("_id")
                .reduce( (o,k) => {o[k]=doc[k]??"";return o;}, {})
                );
        }
    }

    removeDocById( doc_id ) {
        // we don't have full doc. Could figure type from ID, but easier (and more general) to remove from all.
        this.types.forEach( ty => this.index[ty].removeDocByRef( doc_id ) );
    }

    fill() {
        // adds docs to index
        return db.allDocs( { include_docs: true, } )
        .then( docs => docs.rows.forEach( r => this.addDoc( r.doc ) ));
    }

    search( text="" ) {
        return [].concat( ... this.types.map(ty => this.index[ty].search(text)) );
    }

    resetTable () {
        if ( this.result.length > 0 ) {
            this.reselect_id = null ;
            this.result = [];
            this.setTable();
        }
    } 

    select(id) {
        this.select_id = id;
    }

    toTable() {
        let result = [] ;
        let value = document.getElementById("searchtext").value;

        if ( value.length == 0 ) {
            return this.resetTable();
        }
        
        db.allDocs( { // get docs from search
            include_docs: true,
            keys: this.search(value).map( s => s.ref ),
        })
        .then( docs => { // add _id, Text, Type fields to result
            docs.rows.forEach( (r,i)=> result[i]=({_id:r.id,Type:r.doc.type,Text:r.doc[this.fieldlist[r.doc.type][0]]}) );
            return db.query("Doc2Pid", { keys: docs.rows.map( r=>r.id), } );
            })
        .then( docs => db.query("Pid2Name", {keys: docs.rows.map(r=>r.value),} )) // associated patient Id for each
        .then( docs => docs.rows.forEach( (r,i) => result[i].Name = r.value[0] )) // associate patient name
        .then( () => this.result = result.map( r=>({doc:r}))) // encode as list of doc objects
        .then( ()=>this.setTable()) // fill the table
        .catch(err=> {
            Page.err(err);
            this.resetTable();
            });
    }

    setTable() {
        objectTable.fill(this.result);
    }
}

class Image {
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
        Image.srcList.push( this.src ) ;
    }

    static clearSrc() {
        Image.srcList.forEach( s => URL.revokeObjectURL( s ) );
        Image.srcList = [] ;
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
            img.addEventListener( 'click', () => Image.showBigPicture(img) );
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
            catch {}
        try { this.parent.querySelector( ".imageGet").addEventListener( 'click', () => this.getImage() ); }
            catch {}
        try { this.parent.querySelector( ".imageRemove").addEventListener( 'click', () => this.remove() ); }
            catch {}
        try { this.parent.querySelector( ".imageBar").addEventListener( 'change', () => this.handle() ); }
            catch {}
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
            catch{}
    }

    save(doc) {
        if ( this.upload == null ) {
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

class ImagePlus extends Image {
    constructor(...args) {
        super(...args);
        this.text = this.doc?.text ?? "";
        this.title = this.doc?.title ?? "";
        this.category = this.doc?.category ?? "";
    }

    display() {
        super.display();
        this.parent.querySelector(".entryfield_text").innerText = this.text;
        this.parent.querySelector(".entryfield_title").innerText = this.title;
        this.parent.querySelector("select").value = this.category;
    }

    save(doc) {
        super.save(doc);
        doc.text = this.parent.querySelector(".entryfield_text").innerText;
        doc.title = this.parent.querySelector(".entryfield_title").innerText;
        doc.category = this.parent.querySelector("select").value;
    }
}

class ImageNote extends ImagePlus {
    constructor( ...args ) {
        super( ...args );
        this.buttonsdisabled( false );
    }
    
    leave() {
        this.buttonsdisabled( false );
        if (patientId == missionId) {
            objectPage.show( 'MissionList');
        } else if ( objectNoteList.category == 'Uncategorized' ) {
            objectPage.show( 'NoteList');
        } else {
            objectPage.show( 'NoteListCategory', objectNoteList.category);
        }
    }

    store() {
        this.save( this.doc );
        db.put( this.doc )
        .then( resp => {
            Note.select( resp.id );
            return Note.getAllIdDoc(); // to prime list
            })
        .catch( err => Page.err(err) )
        .finally( () => this.leave() );
    }

    edit() {
        this.addListen();
        this.buttonsdisabled( true );
        this.display();
    }

    addListen() {
        super.addListen();
        try { this.parent.querySelector( ".imageSave").addEventListener( 'click', () => this.store() ); }
            catch {}
        try { this.parent.querySelector( ".imageCancel").addEventListener( 'click', () => this.leave() ); }
            catch {}
        try { this.parent.querySelector( ".imageDelete").addEventListener( 'click', () => this.delete() ); }
            catch {}
    }

    buttonsdisabled( bool ) {
        document.querySelectorAll(".libutton" ).forEach( b => b.disabled=bool );
        document.querySelectorAll(".divbutton").forEach( b => b.disabled=bool );
    }

    delete() {
        let pdoc;
        Patient.getRecordId()
        .then( (doc) => {
            pdoc = doc;
            return db.get( noteId );
            })
        .then( (doc) => {
            if ( confirm(`Delete note on patient ${pdoc.FirstName} ${pdoc.LastName} DOB: ${pdoc.DOB}.\n -- Are you sure?`) ) {
                return doc;
            } else {
                throw "No delete";
            }           
            })
        .then( (doc) => db.remove(doc) )
        .then( () => Note.unselect() )
        .catch( (err) => Page.err(err) )
        .finally( () => this.leave() );
    }
}

class ImageQuick extends Image {
    addListen(hfunc) {
        try { this.parent.querySelector( ".imageGet").addEventListener( 'click', () => objectPage.show('QuickPhoto') ); }
            catch {}
        try { this.parent.querySelector( ".imageBar").addEventListener( 'change', () => hfunc() ); }
            catch {}
    }
}

class ImageDrop extends Image { // can only save(doc)
    constructor( upload ) {
        super( null, null );
        this.upload = upload;
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
                    this.images[localname] = new Image( inp, doc, item?.none ) ;
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
            .catch( (err) => Page.err(err) )
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

class MissionData extends PatientData {
    savePatientData() {
        this.saveChanged( "MainMenu" );
    }
}    

class OperationData extends PatientData {
    savePatientData() {
        this.saveChanged( "OperationList" );
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

class NewPatientData extends PatientDataEditMode {
    savePatientData() {
        this.loadDocData();
        // make sure the fields needed for a patient ID are present
        if ( this.doc[0].FirstName == "" ) {
            alert("Need a First Name");
        } else if ( this.doc[0].LastName == "" ) {
            alert("Need a Last Name");
        } else if ( this.doc[0].DOB == "" ) {
            alert("Enter some Date Of Birth");
        } else {
            // create new patient record
            this.doc[0]._id = Patient.makeId( this.doc[0] );
            this.doc[0].patient_id = this.doc[0]._id;
            db.put( this.doc[0] )
            .then( (response) => {
                Patient.select(response.id);
                objectPage.show( "PatientPhoto" );
                })
            .catch( (err) => Page.err(err) );
        }
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
            Page.err(err);
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
                Page.err(err);
                objectPage.show( "UserList" );
                });
        } else if ( User.id in User.password ) {
            objectPage.show( "SendUser" );
        } else {
            // no password to send
            console.log("No password", User.password) ;
            objectPage.show( "UserList" );
        }
    }
}

class AccessData extends PatientData {
    savePatientData() {
        if ( this.loadDocData()[0] ) {
            security_db.put( this.doc[0] )
                .catch( err => Page.err(err) )
                .finally( () => objectPage.show( "UserList" ) );
        } else {
            objectPage.show( "UserList" ) ;
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
            Patient.getRecordIdPix()
                // get patient
            .then( (doc) => {
                pdoc = doc;
                return Note.getRecordsIdDoc();
                })
            .then( (docs) => {
                // get notes
                ndocs = docs.rows;
                return Operation.getRecordsIdDoc();
                })
            .then( (docs) => {
                // get operations
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
            .catch( (err) => Page.err(err) ) 
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
            startkey: [ RecordFormat.type.patient, ""].join(";"),
            endkey:   [ RecordFormat.type.patient, "\\fff0"].join(";"),
        };

        return db.allDocs(doc);
    }
        
    static getAllIdDoc() {
        let doc = {
            startkey: [ RecordFormat.type.patient, ""].join(";"),
            endkey:   [ RecordFormat.type.patient, "\\fff0"].join(";"),
            include_docs: true,
        };

        return db.allDocs(doc);
    }
        
    static getAllIdDocPix() {
        let doc = {
            startkey: [ RecordFormat.type.patient, ""].join(";"),
            endkey:   [ RecordFormat.type.patient, "\\fff0"].join(";"),
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
                // highlight the list row
                if ( objectPage.test('AllPatients') ) {
                    objectTable.highlight();
                }
                document.getElementById( "titlebox" ).innerHTML = doc.rows[0].value[1];
                })
            .catch( (err) => {
                Page.err(err,"patient select");
                Patient.unselect();
                });
        }
    }

    static makeId( doc ) {
        return [ 
            RecordFormat.type.patient,
            RecordFormat.version,
            doc.LastName,
            doc.FirstName,
            doc.DOB, 
            ].join(";");
    }

    static splitId( pid = patientId ) {
        if ( pid ) {
            let spl = pid.split(";");
            if ( spl.length !== 5 ) {
                console.log("Bad PatientId",pid);
                return null;
            }
            return {
                type: spl[0],
                version: spl[1],
                last: spl[2],
                first: spl[3],
                dob: spl[4],
            };
        }
        return null;
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
        if ( objectPage.test("AllPatients") ) {
            let pt = document.getElementById("PatientTable");
            if ( pt ) {
                let rows = pt.rows;
                for ( let i = 0; i < rows.length; ++i ) {
                    rows[i].classList.remove('choice');
                }
            }
        }
        document.getElementById( "titlebox" ).innerHTML = "";
    }

    static menu( doc, notelist, onum=0 ) {
        let d = document.getElementById("PatientPhotoContent2");
        let inp = new Image( d, doc, NoPhoto );

        cloneClass( ".imagetemplate", d );
        inp.display();
        Patient.buttonSub( "nOps", onum );
        NoteList.categorize(notelist);
        Patient.buttonSub( "nAll", notelist.rows.length );
        Patient.buttonCalcSub( "nPreOp",      "Pre Op",     notelist ) ;
        Patient.buttonCalcSub( "nAnesthesia", "Anesthesia", notelist ) ;
        Patient.buttonCalcSub( "nOpNote",     "Op Note",    notelist ) ;
        Patient.buttonCalcSub( "nPostOp",     "Post Op",    notelist ) ;
        Patient.buttonCalcSub( "nFollowup",   "Followup",   notelist ) ;
    }

    static buttonCalcSub( id, cat, notelist ) {
        Patient.buttonSub( id, notelist.rows.filter( r=>r.doc.category==cat ).length );
    }

    static buttonSub( id, num ) {
        let d=document.getElementById(id);
        d.innerText=d.innerText.replace( /\(.*\)/ , `(${num})` );
    }
    
    static printCard() {
        if ( patientId == null ) {
            return objectPage.show( "InvalidPatient" );
        }
        let card = document.getElementById("printCard");
        let t = card.getElementsByTagName("table");
        Patient.getRecordIdPix()
        .then( (doc) => {
            Page.show_screen( "patient" );
            let img = new Image( card, doc, NoPhoto ) ;
            img.display();
            let link = new URL(window.location.href);
            link.searchParams.append( "patientId", patientId );
            new QR(
                card.querySelector(".qrCard"),
                link.href,
                195,195,
                4);
            // patient parameters
            t[0].rows[0].cells[1].innerText = ""; // name
            t[0].rows[1].cells[1].innerText = doc.Complaint??"";
            t[0].rows[2].cells[1].innerText = ""; // procedure
            t[0].rows[3].cells[1].innerText = ""; // length
            t[0].rows[4].cells[1].innerText = ""; // surgeon
            t[0].rows[5].cells[1].innerText = doc.ASA??""; // ASA

            t[1].rows[0].cells[1].innerText = DateMath.age(doc.DOB); 
            t[1].rows[1].cells[1].innerText = doc.Sex??""; 
            t[1].rows[2].cells[1].innerText = doc.Weight+" kg"??"";
            t[1].rows[3].cells[1].innerText = doc.Allergies??"";
            t[1].rows[4].cells[1].innerText = doc.Meds??"";
            t[1].rows[5].cells[1].innerText = ""; // equipment
            return db.query("Pid2Name",{key:doc._id}) ;
            }) 
        .then( (doc) => {
            t[0].rows[0].cells[1].innerText = doc.rows[0].value[0];
            return Operation.getRecordsIdDoc();
            })
        .then( (docs) => {
            let oleng = docs.rows.length;
            switch(oleng) {
                case 0:
                case 1:
                    oleng -= 1 ;
                    break;
                default:
                    oleng -= 2;
                    break;
            }
            if ( oleng >= 0 ) {
                t[0].rows[2].cells[1].innerText = docs.rows[oleng].doc.Procedure??"";
                t[0].rows[3].cells[1].innerText = docs.rows[oleng].doc.Duration + " hr"??"";
                t[0].rows[4].cells[1].innerText = docs.rows[oleng].doc.Surgeon??"";
                t[1].rows[5].cells[1].innerText = docs.rows[oleng].doc.Equipment??"";
            }
            window.print();
            objectPage.show("PatientPhoto");
            })
        .catch( (err) => {
            Page.err(err);
            objectPage.show( "InvalidPatient" );
            });
    }
   
}

class Note { // convenience class
    static getAllIdDoc() {
        let doc = {
            startkey: [ RecordFormat.type.note, ""].join(";"),
            endkey:   [ RecordFormat.type.note, "\\fff0"].join(";"),
            include_docs: true,
            binary: false,
            attachments: false,
        };
        return db.allDocs(doc);
    }

    static getRecordsId() {
        let pspl = Patient.splitId();
        let doc = {
            startkey: [
                RecordFormat.type.note,
                RecordFormat.version,
                pspl.last,
                pspl.first,
                pspl.dob,
                ""].join(";"),
            endkey: [
                RecordFormat.type.note,
                RecordFormat.version,
                pspl.last,
                pspl.first,
                pspl.dob,
                "\\fff0"].join(";"),
        };
        return db.allDocs(doc) ;
    }

    static getRecordsIdDoc() {
        let pspl = Patient.splitId();
        let doc = {
            startkey: [
                RecordFormat.type.note,
                RecordFormat.version,
                pspl.last,
                pspl.first,
                pspl.dob,
                ""].join(";"),
            endkey: [
                RecordFormat.type.note,
                RecordFormat.version,
                pspl.last,
                pspl.first,
                pspl.dob,
                "\\fff0"].join(";"),
            include_docs: true,
        };
        return db.allDocs(doc) ;
    }

    static getRecordsIdPix() {
        let pspl = Patient.splitId();
        let doc = {
            startkey: [
                RecordFormat.type.note,
                RecordFormat.version,
                pspl.last,
                pspl.first,
                pspl.dob,
                ""].join(";"),
            endkey: [
                RecordFormat.type.note,
                RecordFormat.version,
                pspl.last,
                pspl.first,
                pspl.dob,
                "\\fff0"].join(";"),
            include_docs: true,
            binary: true,
            attachments: true,
        };
        return db.allDocs(doc) ;
    }

    static makeId() {
        const spl = Patient.splitId();
            return [ 
            RecordFormat.type.note,
            RecordFormat.version,
            spl.last,
            spl.first,
            spl.dob,
            new Date().toISOString() , 
            ].join(";");
    }

    static splitId( nid=noteId ) {
        if ( nid ) {
            let spl = nid.split(";");
            if ( spl.length !== 6 ) {
                return null;
            }
            return {
                type: spl[0],
                version: spl[1],
                last: spl[2],
                first: spl[3],
                dob: spl[4],
                key: spl[5],
            };
        }
        return null;
    }

    static select( nid=noteId ) {
        // Check patient existence
        db.get(nid)
        .then( doc => {
            if ( doc.patient_id != patientId ) {
                Patient.select( doc.patient_id);
            }
            Cookie.set( "noteId", nid );
            if ( objectPage.test("NoteList") || objectPage.test("NoteListCategory") || objectPage.test("MissionList")) {
                objectNoteList.select() ;
            }
            })
        .catch( err => Page.err(err,"note select"));
    }

    static unselect() {
        Cookie.del ( "noteId" );
        if ( objectPage.test("NoteList") || objectPage.test("NoteListCategory") || objectPage.test("MissionList")) {
            document.getElementById("NoteListContent").querySelectorAll("li")
            .forEach( l => l.classList.remove('choice') );
        }
    }

    static create() { // new note, not class
        let d = document.getElementById("NoteNewContent");
        cloneClass ( ".newnotetemplate_edit", d );
        let doc = Note.template();
        let img = new ImageNote( d, doc );
        img.edit();
    }

    static dropPictureinNote( target ) {
            // Optional.   Show the copy icon when dragging over.  Seems to only work for chrome.
        target.addEventListener('dragover', e => {
            e.stopPropagation();
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            });

        // Get file data on drop
        target.addEventListener('drop', e => {
            e.stopPropagation();
            e.preventDefault();
            // Array of files
            Promise.all(
                Array.from(e.dataTransfer.files)
                .filter( file => file.type.match(/image.*/) )
                .map( file => {
                    let reader = new FileReader();
                    reader.onload = e2 =>
                        fetch(e2.target.result)
                        .then( b64 => b64.blob() )
                        .then( blb => {
                            let doc = Note.template();
                            new ImageDrop(blb).save(doc);
                            return db.put(doc);
                            });
                    reader.readAsDataURL(file); // start reading the file data.
                    }))
                    .then( () => Note.getRecordsId() ) // refresh the list
                    .catch( err => Page.err(err,"Photo drop") )
                    .finally( () => {
                        if (objectNoteList.category=='Uncategorized') {
                            objectPage.show( "NoteList" );
                        } else {
                            objectPage.show( "NoteListCategory",objectNoteList.category );
                        }
                        });
            });
    }

    static template(category=objectNoteList.category) {
        if ( category=='' ) {
            category = 'Uncategorized' ;
        }
        return {
            _id: Note.makeId(),
            text: "",
            title: "",
            author: remoteCouch.username,
            type: "note",
            category: category,
            patient_id: patientId,
            date: new Date().toISOString(),
        };
    }

    static quickPhoto() {
        let inp = document.getElementById("QuickPhotoContent");
        cloneClass( ".imagetemplate_quick", inp );
        let doc = Note.template();
        let img = new ImageQuick( inp, doc );
        function handle() {
            img.handle();
            img.save(doc);
            db.put(doc)
            .then( () => Note.getRecordsId() ) // to try to prime the list
            .catch( err => Page.err(err) )
            .finally( objectPage.show( null ) );
        }
        img.display();
        img.addListen(handle);
        img.getImage();
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
            // highlight the list row
            if ( objectPage.test('OperationList') || objectPage.test('AllOperations')  ) {
                objectTable.highlight();
            }
            })
        .catch( err => {
            Page.err(err,"operation select");
            Operation.unselect();
            });             
    }

    static unselect() {
        operationId = null;
        Cookie.del( "operationId" );
        if ( objectPage.test("OperationList") ) {
            let ot = document.getElementById("OperationsList");
            if ( ot ) {
                let rows = ot.rows;
                for ( let i = 0; i < rows.length; ++i ) {
                    rows[i].classList.remove('choice');
                }
            }
        }
    }

    static makeId() {
        const spl = Patient.splitId();    
        return [ 
            RecordFormat.type.operation,
            RecordFormat.version,
            spl.last,
            spl.first,
            spl.dob,
            new Date().toISOString() , 
            ].join(";");
    }

    static create() {
        let doc = {
            _id: Operation.makeId(),
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
                if ( confirm(`Delete operation \<${doc.Procedure}\>\n on patient ${pdoc.FirstName} ${pdoc.LastName} DOB: ${pdoc.DOB}.\n -- Are you sure?`) ) {
                    return doc;
                } else {
                    throw "No delete";
                }           
                })
            .then( (doc) =>db.remove(doc) )
            .then( () => Operation.unselect() )
            .catch( (err) => Page.err(err) )
            .finally( () => objectPage.show( "OperationList" ) );
        }
        return true;
    }    
        
    static getAllIdDoc() {
        let doc = {
            startkey: [ RecordFormat.type.operation, ""].join(";"),
            endkey:   [ RecordFormat.type.operation, "\\fff0"].join(";"),
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
        let pspl = Patient.splitId(pid);
        let doc = {
            startkey: [
                RecordFormat.type.operation,
                RecordFormat.version,
                pspl.last,
                pspl.first,
                pspl.dob,
                ""].join(";"),
            endkey: [
                RecordFormat.type.operation,
                RecordFormat.version,
                pspl.last,
                pspl.first,
                pspl.dob,
                "\\fff0"].join(";"),
            include_docs: true,
        };
        return db.allDocs(doc) ;
    }
    static getRecordsIdDoc( pid=patientId ) {
        let pspl = Patient.splitId(pid);
        let doc = {
            startkey: [
                RecordFormat.type.operation,
                RecordFormat.version,
                pspl.last,
                pspl.first,
                pspl.dob,
                ""].join(";"),
            endkey: [
                RecordFormat.type.operation,
                RecordFormat.version,
                pspl.last,
                pspl.first,
                pspl.dob,
                "\\fff0"].join(";"),
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
            .catch( (err) => Page.err(err) )
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
        if (attachments) {
            doc.include_docs = true;
            doc.binary = true;
            doc.attachments = true;
        } else {
            doc.limit = 0;
        }
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

        Page.show_screen( "user" ) ;
        window.print();
        objectPage.show("SendUser");
    }
}

class Mission { // convenience class
    static select() {
        Patient.unselect();
        patientId = missionId;
        db.query("Pid2Name", {key:missionId,})
        .then( doc => document.getElementById( "titlebox" ).innerHTML = doc.rows[0].value[1] )
        .catch( (err) => {
            Page.err(err,"mission select");
            document.getElementById( "titlebox" ).innerHTML = "";
            }) ;
    }

    static link() {
        db.get( missionId, { attachments: true, binary: true } )
        .then( doc => {
            let src = new Image( null,doc).source();
            document.querySelectorAll(".missionLogo")
            .forEach( logo => {
                logo.src=src;
                logo.addEventListener( 'click', () => window.open(doc.Link) );
                });
            document.querySelectorAll(".missionButton")
            .forEach( logo => {
                logo.addEventListener( 'click', () => window.open(doc.Link));
                logo.title = `Open ${doc.Mission} website`;
                });
            document.querySelectorAll(".missionButtonImage")
            .forEach( logo => logo.src=src );
            })
        .catch( err => Page.err(err) ) ;
    }
}

class Remote { // convenience class
    constructor( qline ) {
        this.remoteFields = [ "address", "username", "password", "database" ];
        this.remoteDB = null;
        this.syncHandler = null;
        
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
    }

    // Initialise a sync process with the remote server
    foreverSync() {
        this.remoteDB = this.openRemoteDB( remoteCouch ); // null initially
        document.getElementById( "userstatus" ).value = remoteCouch.username;
        if ( this.remoteDB ) {
            const synctext = document.getElementById("syncstatus");

            synctext.value = "download remote...";
            db.replicate.from( this.remoteDB )
            .catch( (err) => synctext.value=err.message )
            .finally( () => {
                synctext.value = "syncing...";
                    
                this.syncHandler = db.sync( this.remoteDB ,
                    {
                        live: true,
                        retry: true,
                        filter: (doc) => doc._id.indexOf('_design') !== 0,
                    } )
                    .on('change', ()       => synctext.value = "changed" )
                    .on('paused', ()       => synctext.value = "resting" )
                    .on('active', ()       => synctext.value = "active" )
                    .on('denied', (err)    => { synctext.value = "denied"; Page.err(err,"Sync denied"); } )
                    .on('complete', ()     => synctext.value = "stopped" )
                    .on('error', (err)     => { synctext.value = err.reason ; Page.err(err,"Sync error"); } );
                });
        }
    }
    
    forceReplicate(id=null) {
        if (this.syncHandler) {
            this.syncHandler.cancel();
            this.syncHandler = null;
        }
        if (this.remoteDB) {
            db.replicate.to( this.remoteDB,
                {
                    filter: (doc) => id ?
                        doc._id == id :
                        doc._id.indexOf('_design') !== 0,
                } )
            .catch( err => Page.err(err,`Replication ${id??""}`))
            .finally( () => this.foreverSync() );
        }
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
            console.log("Bad DB");
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
        let spl = url.split(":\/\/") ;
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

class CSV { // convenience class
    static downloadCSV(csv, filename) {
        let csvFile;
        let downloadLink;
       
        //define the file type to text/csv
        csvFile = new Blob([csv], {type: 'text/csv'});
        downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";

        document.body.appendChild(downloadLink);
        downloadLink.click();
    }

    static downloadPatients() {
        const fields = [ "LastName", "FirstName", "DOB", "Dx", "Weight", "Height", "Sex", "Allergies", "Meds", "ASA" ]; 
        let csv = fields.map( f => '"'+f+'"' ).join(',')+'\n';
        Patient.getAllIdDoc()
        .then( doclist => {
            csv += doclist.rows
                .map( row => fields
                    .map( f => row.doc[f] || "" )
                    .map( v => typeof(v) == "number" ? v : `"${v}"` )
                    .join(',')
                    )
                .join( '\n' );
            CSV.downloadCSV( csv, `${remoteCouch.database}Patient.csv` );
            });
    }

    static downloadAll() {
        const pfields = [ "LastName", "FirstName", "DOB", "Dx", "Weight", "Height", "Sex", "Allergies", "Meds", "ASA" ]; 
        const ofields = [ "Complaint", "Procedure", "Surgeon", "Equipment", "Status", "Date-Time", "Duration", "Lateratility" ]; 
        let csv = pfields
                    .concat(ofields,["Notes"])
                    .map( f => `"${f}"` )
                    .join(',')+'\n';
        let plist;
        let olist = {};
        let nlist = {};
        Patient.getAllIdDoc()
        .then( doclist => {
            plist = doclist.rows;
            plist.forEach( p => nlist[p.id] = 0 );
            return Operation.getAllIdDoc();
            })
        .then ( doclist => {
            doclist.rows
            .filter( row => new Date(row.doc["Date-Time"]) != "Invalid Date" )
            .forEach( row => olist[row.doc.patient_id] = row.doc ) ;
            return Note.getAllIdDoc();
            })
        .then( doclist => {
            doclist.rows.forEach( row => ++nlist[row.doc.patient_id] );
            csv += plist
                .map( row =>
                    pfields
                    .map( f => row.doc[f] ?? "" )
                    .map( v => typeof(v) == "number" ? v : `"${v}"` )
                    .concat(
                        (row.id in olist) ? ofields
                                            .map( ff => olist[row.id][ff] ?? "" )
                                            .map( v => typeof(v) == "number" ? v : `"${v}"` )
                                            :
                                            ofields.map( () => "" ) ,
                        [nlist[row.id]]
                        )
                    .join(',')
                    )
                .join( '\n' );
            CSV.downloadCSV( csv, `${remoteCouch.database}AllData.csv` );
            });
    }

}

class Page { // singleton class
    constructor() {
        this.safeLanding = [
            "MainMenu",
            "FirstTime",
            "Administration",
            "Download",
            "Settings",
            "DBTable",
            "RemoteDatabaseInput",
            "SuperUser",
            "UserList",
//            "UserNew",
//            "UserEdit",
//            "SendUser",
            "AllPatients",
            "SearchList",
            "OperationList",
//            "OperationNew",
            "OperationEdit",
//            "PatientNew",
            "PatientPhoto",
            "MissionInfo",
            "PatientDemographics",
            "PatientMedical",
            "DatabaseInfo",
//            "InvalidPatient",
            "MissionList",
            "NoteList",
//            "NoteListCatagory",
//            "NoteNew",
//            "QuickPhoto",
            ] ;
        const path = Cookie.get( "displayState" );
        if ( !Array.isArray(path) ) {
            this.reset();
        } else {
            this.path = path;
        }

        const safeIndex =
            this.safeLanding
            .map(p=>this.path.indexOf(p))
            .filter(i=>i>-1)
            .reduce( (x,y)=>Math.min(x,y) , 1000 );
        
        if ( safeIndex == 1000 ) {
            this.reset() ;
        } else {
            this.next( this.path[safeIndex] );
        }
    }
    
    reset() {
        // resets to just MainMenu
        this.path = [ "MainMenu" ] ;
        Cookie.set ( "displayState", this.path ) ;
    }

    back() {
        this.path.shift() ;
        if ( this.path.length == 0 ) {
            this.reset();
        }
        if ( this.safeLanding.includes(this.path[0]) ) {
            Cookie.set ( "displayState", this.path ) ;
        } else {
            this.back() ;
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
                Cookie.set ( "displayState", this.path ) ;
            } else {
                // trim page list back to prior occurence of this page (no loops, finite size)
                this.path = this.path.slice( iop ) ;
                Cookie.set ( "displayState", this.path ) ;
            }
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
    
    static err( err, title=null ) {
        // generic console.log of error
        console.log( title ?? objectPage.current(), err.message ?? err ) ;
    }
        
    show( state = "AllPatients", extra="" ) { // main routine for displaying different "pages" by hiding different elements
        Page.show_screen( "screen" );
        this.next(state) ; // update reversal list

        document.querySelector(".patientDataEdit").style.display="none"; 
        document.querySelectorAll(".topButtons")
            .forEach( (v) => v.style.display = "block" );

        document.querySelectorAll(".pageOverlay")
            .forEach( (v) => v.style.display = v.classList.contains(this.current()) ? "block" : "none" );

        objectPatientData = null;
        objectTable = null;

        // clear old image urls
        Image.clearSrc() ;

        if ( db == null || remoteCouch.database=='' ) {
            // can't bypass this! test if database exists
            if ( state != "FirstTime" ) {
                this.next("RemoteDatabaseInput");
            }
        }

        switch( objectPage.current() ) {  
            case "MainMenu":
            case "Administration":
            case "Download":
            case "Settings":
                // Pure menus
                break;
                
            case "AllOperations":
            {
                Patient.unselect();
                let last_pid = "" ;
                let olist;
                Operation.getAllIdDocCurated()
                .then( doclist => {
                    olist = doclist ;
                    return db.query( "Pid2Name",{keys:olist.map(r=>r.doc.patient_id),});
                    })  
                .then( nlist => {
                    const n2id = {} ;
                    // create an pid -> name dict
                    nlist.rows.forEach( n => n2id[n.key]=n.value[0] );
                    // Assign names, filter out empties
                    olist.forEach( r => r.doc.Name = ( r.doc.patient_id in n2id ) ? n2id[r.doc.patient_id] : "" ) ;
                    objectTable = new AllOperationTable();
                    // Default value
                    objectTable.fill(olist.filter(o=>o.doc.Name!==""));
                    })
                .catch( err=>Page.err(err) )
                    ;
                break;
            }
                
            case "AllPatients":
                objectTable = new PatientTable();
                let o2pid = {} ;
                Operation.getAllIdDocCurated()
                .then( doclist => {
                    doclist.forEach( r => o2pid[r.doc.patient_id] = ({
                        "Procedure": r.doc["Procedure"],
                        "Date-Time": r.doc["Date-Time"],
                        "Surgeon": r.doc["Surgeon"],
                        })) ;
                    return Patient.getAllIdDoc() ;
                    })
                .then( (docs) => {
                    docs.rows.forEach( r => Object.assign( r.doc, o2pid[r.id]) );
                    objectTable.fill(docs.rows );
                    if ( Patient.isSelected() ) {
                        Patient.select( patientId );
                    } else {
                        Patient.unselect();
                    }
                    })
                .catch( (err) => Page.err(err) );
                break;

            case "DatabaseInfo":
                db.info()
                .then( doc => {
                    objectPatientData = new DatabaseInfoData( doc, structDatabaseInfo );
                    })
                .catch( err => Page.err(err) );
                break;

            case "DBTable":
                objectTable = new DatabaseTable();
                Collation.getAllIdDoc()
                .then( (docs) => {
                    objectTable.fill(docs.rows) ;
                    })
                .catch( (err) => Page.err(err) );
                break ;

            case "FirstTime":
                if ( db !== null ) {
                    this.show("MainMenu");
                }
                break;
                
            case "InvalidPatient":
                Patient.unselect();
                break;

            case "MissionInfo":
                Mission.select();
                Patient.getRecordIdPix()
                .then( (doc) => objectPatientData = new MissionData( doc, structMission ) )
                .catch( () => {
                    let doc = {
                        _id: missionId,
                        author: remoteCouch.username,
                        patient_id: missionId,
                        type: "mission",
                    };
                    objectPatientData = new MissionData( doc, structMission ) ;
                    })
                .finally( () => Mission.link() );
                break;
                
            case "MissionList":
                Mission.select() ;
                db.get( missionId )
                .then( () => Note.getRecordsIdPix() )
                .then( notelist => objectNoteList = new NoteList(notelist,'Uncategorized') )
                .catch( ()=> objectPage.show( "MissionInfo" ) ) ;
                break;
                
            case "NoteList":
                extra = 'Uncategorized';
                // Fall through
            case "NoteListCategory":
                if ( Patient.isSelected() ) {
                    Note.getRecordsIdPix()
                    .then( notelist => objectNoteList = new NoteList(notelist,extra) )
                    .catch( (err) => {
                        Page.err(err,`Notelist (${extra})`);
                        this.show( "InvalidPatient" );
                        });
                } else {
                    this.show( "AllPatients" );
                }
                break;
                
             case "NoteNew":
                if ( Patient.isSelected() ) {
                    // New note only
                    Note.unselect();
                    Note.create();
                } else if ( patientId == missionId ) {
                    this.show( 'MissionList' ) ;
                } else {
                    this.show( "AllPatients" );
                }
                break;
                
            case "OperationEdit":
                if ( operationId ) {
                    db.get( operationId )
                    .then ( doc => {
                        Patient.select( doc.patient_id ); // async set title
                        return doc ;
                        })
                    .then( (doc) => objectPatientData = new OperationData( doc, structOperation ) )
                    .catch( (err) => {
                        Page.err(err);
                        this.show( "InvalidPatient" );
                        });
                } else if ( ! Patient.isSelected() ) {
                    this.show( "AllPatients" );
                } else {
                    objectPatientData = new OperationData(
                    {
                        _id: Operation.makeId(),
                        type: "operation",
                        patient_id: patientId,
                        author: remoteCouch.username,
                    } , structOperation );
                }
                break;
                
            case "OperationList":
                if ( Patient.isSelected() ) {
                    objectTable = new OperationTable();
                    Operation.getRecordsIdDoc()
                    .then( (docs) => objectTable.fill(docs.rows ) )
                    .catch( (err) => Page.err(err) );
                } else {
                    this.show( "AllPatients" ) ;
                }
                break;
                
            case "OperationNew":
                if ( Patient.isSelected() ) {
                    Operation.unselect();
                    this.show( "OperationEdit" );
                } else {
                    this.show( "AllPatients" ) ;
                }
                break;
            
            case "PatientDemographics":
                if ( Patient.isSelected() ) {
                    Patient.getRecordIdPix()
                    .then( (doc) => objectPatientData = new PatientData( doc, structDemographics ) )
                    .catch( (err) => {
                        Page.err(err);
                        this.show( "InvalidPatient" );
                        });
                } else {
                    this.show( "AllPatients" );
                }
                break;
                
            case "PatientMedical":
                if ( Patient.isSelected() ) {
                    let args;
                    Patient.getRecordId()
                    .then( (doc) => {
                        args = [doc,structMedical];
                        return Operation.getRecordsIdDoc();
                        })
                    .then( ( olist ) => {
                        olist.rows.forEach( (r) => args.push( r.doc, structOperation ) );
                        objectPatientData = new PatientData( ...args );
                        })
                    .catch( (err) => {
                        Page.err(err);
                        this.show( "InvalidPatient" );
                        });
                } else {
                    this.show( "AllPatients" );
                }
                break;
                
            case "PatientNew":
                Patient.unselect();
                objectPatientData = new NewPatientData(
                    {
                        author: remoteCouch.username,
                        type:"patient"
                    }, structNewPatient );
                break;
                
            case "PatientPhoto":
                if ( Patient.isSelected() ) {
                    Patient.select( patientId );
                    let pdoc;
                    let onum ;
                    Patient.getRecordIdPix()
                    .then( (doc) => {
                        pdoc = doc;
                        return Operation.getRecordsIdDoc(); 
                        })
                    .then ( (doclist) => {
                        onum = doclist.rows.filter( r=> r.doc.Procedure !== "Enter new procedure").length ;
                        return Note.getRecordsIdDoc(); 
                        })
                    .then ( (notelist) => Patient.menu( pdoc, notelist, onum ) )
                    .catch( (err) => {
                        Page.err(err);
                        this.show( "InvalidPatient" );
                        });
                } else {
                    this.show( "AllPatients" );
                }
                break;
                
           case "QuickPhoto":
                this.forget(); // don't return here!
                if ( patientId ) { // patient or Mission!
                    Note.quickPhoto(extra);
                } else {
                    this.show( "AllPatients" );
                }
                break;
                
            case "RemoteDatabaseInput":
                objectPatientData = new DatabaseData( Object.assign({},remoteCouch), structDatabase );
                break;
                
            case "SearchList":
                objectTable = new SearchTable() ;
                objectSearch.setTable();
                break ;
                
            case "SendUser":
                if ( User.db == null ) {
                    this.show( "SuperUser" );
                } else if ( User.id == null || !(User.id in User.password) ) {
                    this.show( "UserList" );
                } else {
                    User.db.get( User.id )
                    .then( doc => User.send( doc ) )
                    .catch( err => {
                        Page.err(err);
                        this.show( "UserList" );
                        });
                }
                break;
                
            case "SuperUser":
                remoteUser.address = remoteCouch.address;
                objectPatientData = new SuperUserData( Object.assign({},remoteUser), structSuperUser );
                break;
                
            case "UserEdit":
                if ( User.db == null ) {
                    this.show( "SuperUser" );
                } else if ( User.id == null ) {
                    this.show( "UserList" );
                } else {
                    User.db.get( User.id )
                    .then( doc => {
                        doc.roles = doc.roles[0]; // unarray
                        objectPatientData = new EditUserData( doc, structEditUser );
                        })
                    .catch( err => {
                        Page.err(err);
                        User.unselect();
                        this.show( "UserList" );
                        });
                }
                break;
                
            case "UserList":
                if ( User.db == null ) {
                    this.show( "SuperUser" );
                } else {
                    objectTable = new UserTable();
                    User.getAllIdDoc()
                    .then( docs => objectTable.fill(docs.rows ) )
                    .catch( (err) => {
                        Page.err(err);
                        this.show ( "SuperUser" );
                        });
                }
                break;

            case "UserNew":
                if ( User.db == null ) {
                    this.show( "SuperUser" );
                } else {
                    User.unselect();
                    objectPatientData = new NewUserData( {}, structNewUser );
                }
                break;

            default:
                this.show( "AllPatients" );
                break;
        }
    }

    static show_screen( type ) { // switch between screen and print
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

        // set Search buttons
        document.querySelectorAll(".Search").forEach( s => {
            s.title = "Search everywhere for a word or phrase" ;
            s.addEventListener("click",()=>objectPage.show('SearchList'));
            });

        // set Quick Photo buttons
        document.querySelectorAll(".Qphoto").forEach( q => {
            q.title = "Quick photo using camera or from gallery" ;
            q.addEventListener("click",()=>objectPage.show('QuickPhoto'));
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

function isAndroid() {
    return navigator.userAgent.toLowerCase().indexOf("android") > -1;
}

/*!
 * swiped-events.js - v@version@
 * Pure JavaScript swipe events
 * https://github.com/john-doherty/swiped-events
 * @inspiration https://stackoverflow.com/questions/16348031/disable-scrolling-when-touch-moving-certain-element
 * @author John Doherty <www.johndoherty.info>
 * @license MIT
 * Modified By Paul Alfille -- class format use only default settings
 */

class Swipe {
    constructor() {
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), false);
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), false);
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), false);
        this.reset();
    }

    reset() {
        this.xDown = null;
        this.yDown = null;
        this.xDiff = null;
        this.yDiff = null;
        this.timeDown = null;
        this.startEl = null;
    }

    /**
     * Fires swiped event if swipe detected on touchend
     * @param {object} e - browser event object
     * @returns {void}
     */
    handleTouchEnd(e) {
        // if the user released on a different target, cancel!
        if (this.startEl !== e.target) {
            this.reset() ;
            return ;
        }

        let timeDiff = Date.now() - this.timeDown;
        if ( timeDiff > 500 ) {    // default 500ms
            this.reset() ;
            return ;
        }

        let eventType = '';

        if (Math.abs(this.xDiff) > Math.abs(this.yDiff)) { // most significant
            if (Math.abs(this.xDiff) > 20) { // default 20px
                eventType = (this.xDiff > 0)?'swiped-left':'swiped-right';
            }
        }
        else if (Math.abs(this.yDiff) > 20) { // default 20px
            eventType = (this.yDiff > 0)?'swiped-up':'swiped-down';
        } else {
            this.reset() ;
            return ;
        }

        let changedTouches = e.changedTouches || e.touches || [];
        let eventData = {
            dir: eventType.replace(/swiped-/, ''),
            touchType: (changedTouches[0] || {}).touchType || 'direct',
            xStart: parseInt(this.xDown, 10),
            xEnd: parseInt((changedTouches[0] || {}).clientX || -1, 10),
            yStart: parseInt(this.yDown, 10),
            yEnd: parseInt((changedTouches[0] || {}).clientY || -1, 10)
        };

        // fire `swiped` event event on the element that started the swipe
        //this.startEl.dispatchEvent(new CustomEvent('swiped', { bubbles: true, cancelable: true, detail: eventData }));

        // fire `swiped-dir` event on the element that started the swipe
        this.startEl.dispatchEvent(new CustomEvent(eventType, { bubbles: true, cancelable: true, detail: eventData }));

        this.reset() ;
    }

    /**
     * Records current location on touchstart event
     * @param {object} e - browser event object
     * @returns {void}
     */
    handleTouchStart(e) {
        // if the element has data-swipe-ignore="true" we stop listening for swipe events
        if (e.target.getAttribute('data-swipe-ignore') === 'true') return;

        this.startEl = e.target;

        this.timeDown = Date.now();
        this.xDown = e.touches[0].clientX;
        this.yDown = e.touches[0].clientY;
        this.xDiff = 0;
        this.yDiff = 0;
    }

    /**
     * Records location diff in px on touchmove event
     * @param {object} e - browser event object
     * @returns {void}
     */
    handleTouchMove(e) {
        if (!this.xDown || !this.yDown) return;

        this.xDiff = this.xDown - e.touches[0].clientX;
        this.yDiff = this.yDown - e.touches[0].clientY;
    }

}
var objectSwipe = new Swipe() ;

class SortTable {
    constructor( collist, tableId, aliaslist=[] ) {
        this.tbl = document.getElementById(tableId);
        this.tbl.innerHTML = "";
        this.collist = collist;
        
        // alias-list is a list in form (list of lists):
        //[ [fieldname, aliasname, transformfunction],...]
        
        this.aliases={};
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
            ['click','swiped-right','swiped-left']
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
        .catch( (err) => document.getElementById( "titlebox" ).innerHTML = [remoteCouch.address, remoteCouch.database].join(" ") ) ;
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
        .catch( (err) => this.unselect() )
        .finally( () => document.getElementById("switchdatabase").disabled = (this.databaseId==null) || (this.databaseId==this.loadedId) ) ;
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
            .catch( (err) => Page.err(err,"Loading patient database") )
            .finally( () => {
                objectPage.reset();
                location.reload(); // force reload
                }) ;
        } else {
            objectPage.show( "MainMenu" ) ;
        }        
    }
}

class AllOperationTable extends SortTable {
    constructor() {
        super( 
        [ "Date-Time","Name","Procedure","Surgeon" ], 
        "OperationsList",
        [
            ["Date-Time","Date",(doc)=>doc["Date-Time"].substring(0,10)]
        ]
        );
    }

    selectId() {
        return operationId;
    }

    selectFunc(id) {
        Operation.select(id) ;
    }

    editpage() {
        objectPage.show("OperationEdit");
    }
}

class OperationTable extends SortTable {
    constructor() {
        super( 
        [ "Date-Time","Procedure", "Surgeon" ], 
        "OperationsList",
        [
            ["Date-Time","Date",(doc)=>doc["Date-Time"].substring(0,10)]
        ]
        );
    }

    selectId() {
        return operationId;
    }

    selectFunc(id) {
        Operation.select(id) ;
    }

    editpage() {
        objectPage.show("OperationEdit");
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

class SearchTable extends SortTable {
    constructor() {
        super( 
        ["Name","Type","Text"], 
        "SearchList"
        );
    }

    selectId() {
        return objectSearch.select_id;
    }

    selectFunc(id) {
        objectSearch.select_id = id ;
        objectTable.highlight();
    }
    
    // for search -- go to a result of search
    editpage() {
        let id = objectSearch.select_id;
        if ( id == null ) {
            objectPage.show( null );
        } else if ( id == missionId ) {
            Mission.select();
            objectPage.show( 'MissionInfo' ) ;
        } else {
            db.get( id )
            .then( doc => {
                switch (doc.type) {
                    case 'patient':
                        Patient.select( id );
                        objectPage.show( 'PatientPhoto' ) ;
                        break ;
                    case 'operation':
                        Patient.select( doc.patient_id );
                        Operation.select( id );
                        objectPage.show( 'OperationEdit' );
                        break ;
                    case 'note':
                        if ( doc.patientId == missionId ) {
                            Mission.select();
                        } else {
                            Patient.select( doc.patient_id );
                        }
                        Note.select( id );
                        objectPage.show( 'NoteList' );
                        break ;
                    default:
                        objectPage.show( null );
                        break ;
                    }
            })
            .catch( err => {
                Page.err(err);
                objectPage.show(null);
                });
        }
    }
}

function cloneClass( fromClass, target ) {
    let c = document.getElementById("templates").querySelector(fromClass);
    target.innerHTML = "";
    c.childNodes.forEach( cc => target.appendChild(cc.cloneNode(true) ) );
}    

class NoteList {
    constructor( notelist, category="Uncategorized" ) {
        this.category = category;
        if ( category == "" ) {
            this.category = "Uncategorized" ;
        }
        NoteList.categorize(notelist);

        let parent = document.getElementById("NoteListContent") ;
        parent.innerHTML = "" ;

        // Filter or sort
        if ( this.category !== 'Uncategorized' ) {
            // category selected, must filter
            notelist.rows = notelist.rows.filter( r=>r.doc.category == this.category ) ;
        }

        // Separate rows into groups by year (and "Undated")
        this.year={};
        notelist.rows
        .forEach( r => {
            let y = this.yearTitle(r);
            if ( y in this.year ) {
                this.year[y].rows.push(r);
            } else {
                this.year[y] = { open:false, rows:[r] } ;
            }
        });
        this.yearKeys = Object.keys(this.year).sort() ;
        
        let fieldset = document.getElementById("templates").querySelector(".noteFieldset");
        
        // show notes
        if ( notelist.rows.length == 0 ) {
            parent.appendChild( document.querySelector(".emptynotelist").cloneNode(true) );
        } else {
            this.yearKeys.forEach( y => {
                let fs = fieldset.cloneNode( true ) ;
                fs.querySelector(".yearspan").innerText = y ;
                fs.querySelector(".yearnumber").innerText = `(${this.year[y].rows.length})` ;
                parent.appendChild(fs);
                let ul = document.createElement('ul');
                fs.appendChild(ul);
                this.year[y].rows.forEach( note => {
                    let li1 = this.liLabel(note);
                    ul.appendChild( li1 );
                    let li2 = this.liNote(note,li1);
                    ul.appendChild( li2 );
                    });
                this.close(fs);
                });
        }

        // Highlight (and open fieldset) selected note
        // this includes recently edited or created
        this.select() ;
        
        // if only one year open fieldset
        if ( this.yearKeys.length == 1 ) {
            this.open(parent.querySelector("fieldset"));
        }
        
        
        Note.dropPictureinNote( parent );        
    }
    
    open( fs ) {
        fs.querySelector("ul").style.display=""; // show
        fs.querySelector(".triggerbutton").innerHTML="&#10134;";
        fs.querySelector(".triggerbutton").onclick = () => this.close(fs) ;
    }
    
    close( fs ) {
        fs.querySelector("ul").style.display="none"; // show
        fs.querySelector(".triggerbutton").innerHTML="&#10133;";
        fs.querySelector(".triggerbutton").onclick = () => this.open(fs) ;
    }
    
    select() {
        // select noteId in list and highlight (if there)
        document.getElementById("NoteListContent")
        .querySelectorAll("fieldset")
        .forEach( fs => fs.querySelectorAll("li")
            .forEach(li=>{
                if ( li.getAttribute("data-id") == noteId ) {
                    li.classList.add('choice');
                    this.open(fs);
                    li.scrollIntoView();
                } else {
                    li.classList.remove('choice');
                }
                })
            ) ;
    }
    
    static categorize( notelist ) {
        // place categories (if none exist)
        notelist.rows.forEach(r=> r.doc.category = r.doc?.category ?? "Uncategorized" ); 
        notelist.rows.forEach(r=> { if (r.doc.category=='') r.doc.category = "Uncategorized" ; } ); 
    }

    yearTitle(row) {
        if ( row.doc.date==undefined ) {
            return "Undated" ;
        } else {
            const d = new Date(row.doc.date);
            return d.getFullYear().toString() ;
        }
    }
        
    fsclick( target ) {
        if ( this.yearKeys.length > 1 ) {
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
    
    liLabel( note ) {
        let li = document.createElement("li");
        li.setAttribute("data-id", note.id );

        li.appendChild( document.getElementById("templates").querySelector(".notelabel").cloneNode(true) );

        li.querySelector(".inly").appendChild( document.createTextNode( ` by ${this.noteAuthor(note)}` ));
        li.querySelector(".flatpickr").value = flatpickr.formatDate(this.noteDate(note),"Y-m-d h:i K");
        li.addEventListener( 'click', () => Note.select( note.id ) );

        return li;
    }

    liNote( note, label ) {
        let li = document.createElement("li");
        li.setAttribute("data-id", note.id );
        let img;
        if ( noteId == note.id ) {
            li.classList.add("choice");
        }
        if ( "doc" in note ) {
            cloneClass( ".notetemplate", li );
            img=new ImageNote(li,note.doc);
            img.display();
        }    
        
        let edit_note = () => {
            flatpickr( label.querySelector(".flatpickr"),
                {
                    time_24hr: false,
                    enableTime: true,
                    noCalendar: false,
                    dateFormat: "Y-m-d h:i K",
                    onChange: (d) => note.doc.date=d[0].toISOString(),
                });
            Note.select( note.id );
            cloneClass( ".notetemplate_edit", li );
            img.edit();
            } ;
        li.addEventListener( 'click', () => Note.select( note.id ) );
        ['dblclick','swiped-right','swiped-left'].forEach( ev =>
            [li, label].forEach( targ => targ.addEventListener( ev, edit_note )));
        label.querySelector(".edit_note").addEventListener( 'click', edit_note );

        return li;
    }

    noteAuthor( doc ) {
        let author = remoteCouch.username;
        if ( doc  && doc.id ) {
            if ( doc.doc && doc.doc.author ) {
                author = doc.doc.author;
            }
        }
        return author;
    }

    noteDate( doc ) {
        let date = new Date().toISOString();
        if ( doc  && doc.id ) {
            date = Note.splitId(doc.id).key;
            if ( doc.doc && doc.doc.date ) {
                date = doc.doc.date;
            }
        }
        return new Date(date);
    }

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

function parseQuery() {
    // returns a dict of keys/values or null
    let url = new URL(location.href);
    let r = {};
    for ( let [n,v] of url.searchParams) {
        r[n] = v;
    }
    //location.search = "";
    return r;
}

function clearLocal() {
    const remove = confirm("Remove the eMission data and your credentials from this device?\nThe central database will not be affected.") ;
    if ( remove ) {
        Cookie.del( "patientId" );
        Cookie.del("remoteCouch");
        Cookie.del("operationId");
        Cookie.del( "commentId" );
        db.destroy().finally( ()=>objectPage.reset() );
    }
    objectPage.show( "MainMenu" );
}

function cookies_n_query() {
    Cookie.get ( "patientId" );
    Cookie.get ( "commentId" );
    objectPage = new Page();
    Cookie.get ( "operationId" );

    
    // need to establish remote db and credentials
    // first try the search field
    const qline = parseQuery();
    objectRemote = new Remote( qline ) ;
    
    // first try the search field
    if ( qline && ( "patientId" in qline ) ) {
        Patient.select( qline.patientId );
        objectPage.next("PatientPhoto");
    }
}

// Application starting point
window.onload = () => {
    // Initial splash screen

    // Stuff into history to block browser BACK button
    window.history.pushState({}, '');
    window.addEventListener('popstate', ()=>window.history.pushState({}, '') );

    // Service worker (to manage cache for off-line function)
    if ( 'serviceWorker' in navigator ) {
        navigator.serviceWorker
        .register('/sw.js')
        .catch( err => Page.err(err,"Service worker registration") );
    }
    
    Page.setButtons() ;

    // set state from URL or cookies
    cookies_n_query() ; // look for remoteCouch and other cookies

    // database list
    objectCollation = new Collation();

    // Start pouchdb database       
    if ( remoteCouch.database !== "" ) {
        db = new PouchDB( remoteCouch.database, {auto_compaction: true} ); // open local copy
        document.getElementById("headerboxlink").addEventListener("click",()=>objectPage.show("MainMenu"));

        // Set up text search
        objectSearch = new Search();
        objectSearch.fill()
        .then ( () =>
            // now start listening for any changes to the database
            db.changes({ since: 'now', live: true, include_docs: true, })
            .on('change', (change) => {
                // update search index
                if ( change?.deleted ) {
                    objectSearch.removeDocById(change.id);
                } else {
                    objectSearch.addDoc(change.doc);
                }
                // update screen display
                switch ( change?.doc?.type ) {
                    case "patient":
                        if ( objectPage.test("AllPatients") ) {
                            objectPage.show("AllPatients");
                        }
                        break;
                    case "note":
                        if ( objectPage.test("NoteList") && change.doc?.patient_id==patientId ) {
                            objectPage.show("NoteList");
                        } else if ( objectPage.test("MissionList") && change.doc?.patient_id==missionId ) {
                            objectPage.show("MissionList");
                        }
                        break;
                    case "operation":
                        if ( objectPage.test("OperationList") && change.doc?.patient_id==patientId ) {
                            objectPage.show("OperationList");
                        }
                        break;
                }
                })
            )
        .catch( err => Page.err(err,"Initial search database") );

            // start sync with remote database
            objectRemote.foreverSync();

            // set link for mission
            Mission.link();

            // Secondary indexes
            createQueries();
            db.viewCleanup()
            .catch( err => Page.err(err,"View cleanup") );

        // now jump to proper page
        objectPage.show( null ) ;

        // Set patient, operation and note -- need page shown first
        if ( Patient.isSelected() ) { // mission too
            Patient.select() ;
        }
        if ( operationId ) {
            Operation.select(operationId) ;
        }
        if ( noteId ) {
            Note.select() ;
        }

    } else {
        db = null;
        objectPage.reset();
        objectPage.show("FirstTime");
    }

};
