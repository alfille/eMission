"use strict";

/* jshint esversion: 6 */

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
                            `${doc.Organization??""} ${doc.Name??doc._id}`,
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
    .catch( (err) => objectLog.err(err) );
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
        if ( objectNoteList.category == 'Uncategorized' ) {
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
        .catch( err => objectLog.err(err) )
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
        .catch( (err) => objectLog.err(err) )
        .finally( () => this.leave() );
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
                document.getElementById( "titlebox" ).innerHTML = doc.rows[0].value[1];
                })
            .catch( (err) => {
                objectLog.err(err,"patient select");
                Patient.unselect();
                });
        }
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

}

class Operation { // convenience class
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

class Mission { // convenience class
    static select() {
        Patient.unselect();
        patientId = missionId;
        db.query("Pid2Name", {key:missionId,})
        .then( doc => document.getElementById( "titlebox" ).innerHTML = doc.rows[0].value[1] )
        .catch( (err) => {
            objectLog.err(err,"mission select");
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
        .catch( err => objectLog.err(err,"Mission info") ) ;
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
                    .on('denied', (err)    => { synctext.value = "denied"; objectLog.err(err,"Sync denied"); } )
                    .on('complete', ()     => synctext.value = "stopped" )
                    .on('error', (err)     => { synctext.value = err.reason ; objectLog.err(err,"Sync error"); } );
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
            .catch( err => objectLog.err(err,`Replication ${id??""}`))
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
            "Administration",
            "Download",
            "Settings",
            "DBTable",
            "RemoteDatabaseInput",
            "SuperUser",
//            "OperationNew",
            "OperationEdit",
//            "PatientNew",
            "PatientPhoto",
            "PatientDemographics",
            "PatientMedical",
            "DatabaseInfo",
//            "InvalidPatient",
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
    
    show( state = "AllPatients", extra="" ) { // main routine for displaying different "pages" by hiding different elements
        Page.show_screen( "screen" );
        this.next(state) ; // update reversal list

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
            case "Download":
                // Pure menus
                break;
                
            case "DatabaseInfo":
                db.info()
                .then( doc => {
                    objectPatientData = new DatabaseInfoData( doc, structDatabaseInfo );
                    })
                .catch( err => objectLog.err(err) );
                break;

            case "ErrorLog":
                objectLog.show() ;
                break ;

            case "InvalidPatient":
                Patient.unselect();
                break;

            default:
				// jump back to main menu
                window.location.href="/index.html" ;
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

function cloneClass( fromClass, target ) {
    let c = document.getElementById("templates").querySelector(fromClass);
    target.innerHTML = "";
    c.childNodes.forEach( cc => target.appendChild(cc.cloneNode(true) ) );
}    

class Log{
    constructor() {
        this.list = []
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
    let url = new URL(location.href);
    let r = {};
    for ( let [n,v] of url.searchParams) {
        r[n] = v;
    }
    //location.search = "";
    return r;
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
        .catch( err => objectLog.err(err,"Service worker registration") );
    }
    
    Page.setButtons() ;

    // set state from URL or cookies
    cookies_n_query() ; // look for remoteCouch and other cookies

    // Start pouchdb database       
    if ( remoteCouch.database !== "" ) {
        db = new PouchDB( remoteCouch.database, {auto_compaction: true} ); // open local copy
        document.getElementById("headerboxlink").addEventListener("click",()=>objectPage.show("MainMenu"));


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
