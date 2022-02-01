"use strict";

// globals not cookie backed
var objectPatientData;
var objectNoteList;
var objectPatientTable = null;
var objectOperationTable = null;
var objectUserTable = null;
var userId = null; // not cookie backed
var userPass = {};

// globals cookie backed
var displayState;
var patientId;
var noteId;
var operationId;
var remoteCouch;
var NoPhoto = "style/NoPhoto.png";

var UniqueSurgeons;
var UniqueEquipment;
var UniqueProcedure;

// Create/Open the database (locally) 
var db ; // will be Pouchdb local copy 
var admin_db = null;
const remoteAdmin = {
    database: "_users" ,
    username: "admin",
    password: "",
    address: "",
    };

// For remote replication
const remoteFields = [ "address", "username", "password", "database" ];
// used for record keys ( see makePatientId, etc )
const RecordFormat = {
    type: {
        patient: "p" ,
        operation: "o" ,
        note: "c" ,
        } ,
    version: 0,
};

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
        type: "calclist",
        choices: "byProcedure"
    },
    {
        name: "Surgeon",
        hint: "Surgeon(s) involved",
        type: "calclist",
        choices: "bySurgeon"
    },
    {
        name: "Equipment",
        hint: "Special equipment",
        type: "calclist",
        choices: "byEquipment"
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
        alias: "Dabase name",
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
        choices: ["user","admin",],
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
        choices: ["user","admin",],
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

// Create pouchdb indexes. Used for links between records and getting list of choices
// change version number to force a new version
function createIndexes() {
    let ddoclist = [
    {
        _id: "_design/bySurgeon" ,
        version: 1,
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
        version: 1,
        views: {
            byEquipment: {
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
        _id: "_design/byProcedure" ,
        version: 1,
        views: {
            byProcedure: {
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
        _id: "_design/Patient2Operation" ,
        version: 0,
        views: {
            Patient2Operation: {
                map: function( doc ) {
                    if ( doc.type=="operation" ) {
                        emit( doc.patient_id );
                    }
                }.toString(),
            },
        },
    }, 
    {
        _id: "_design/Patient2Note" ,
        version: 0,
        views: {
            Patient2Note: {
                map: function( doc ) {
                    if ( doc.type=="note" ) {
                        emit( doc.patient_id );
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
        .catch( (err) => {
            // assume because this is first time and cannot "get"
            console.log(err);
            return db.put( ddoc );
            });
        }))
    .catch( (err) => console.log(err ) );
}

function testScheduleIndex() {
}

// data entry page type
// except for Noteslist and some html entries, this is the main type
class PatientData {
    constructor(...args) {
        this.parent = document.getElementById("PatientDataContent");
        let fieldset = document.getElementById("templates").querySelector("fieldset");
        
        this.doc = [];
        this.struct = [];
        this.ul = [];
        this.pairs = 0;

        for ( let iarg = 0; iarg<args.length; ++iarg ) {
            this.doc[this.pairs] = args[iarg];
            ++ iarg;
            if ( iarg == args.length ) {
                break;
            }
            this.struct[this.pairs] = args[iarg];
            ++ this.pairs;
        } 
        
        this.ButtonStatus( true );
        [...document.getElementsByClassName("edit_note")].forEach( (e) => {
            e.disabled = false;
        });
        picker.detach();
        this.parent.innerHTML = "";
        
        for ( let ipair = 0; ipair < this.pairs; ++ ipair ) {
            let fs = fieldset.cloneNode( true );
            this.ul[ipair] = this.fill(ipair);
            fs.appendChild( this.ul[ipair] );
            this.parent.appendChild( fs );
        }
    }
    
    fill( ipair ) {
        let doc = this.doc[ipair];
        let struct = this.struct[ipair];

        let ul = document.createElement('ul');
        
        struct.forEach( ( item, idx ) => {
            let li = document.createElement("li");
            li.setAttribute("data-index",idx);
            let l = document.createElement("label");
            li.appendChild(l);
            
            if ( "alias" in item ) {
                l.appendChild( document.createTextNode(item.alias + ": ") );
            } else {
                l.appendChild( document.createTextNode(item.name + ": ") );
            }
            l.title = item.hint;

            let i = null;
            switch( item.type ) {
                case "radio":
                    {
                    let v  = "";
                    let any_choices = item.choices.length > 0;
                    if ( item.name in doc ) { 
                        v = doc[item.name];
                        if ( !item.choices.includes(v) && any_choices ) {
                            v = item.choices[0];
                        }
                    } else if ( any_choices ) {
                        v = item.choices[0];
                    }
                        
                    item.choices.forEach( (c) => {
                        i = document.createElement("input");
                        i.type = "radio";
                        i.name = item.name;
                        i.value = c;
                        if ( c == v ) {
                            i.checked = true;
                            i.disabled = false;
                        } else {
                            i.disabled = true;
                        }
                        i.title = item.hint;
                        l.appendChild(i);
                        l.appendChild( document.createTextNode(c) );
                    }); 
                    }
                    break;
                case "list":
                    {
                    let v  = "";
                    let any_choices = item.choices.length > 0;
                    if ( item.name in doc ) {
                        v = doc[item.name];
                    } else if ( any_choices ) {
                        v = item.choices[0];
                    }
                    let dlist = document.createElement("datalist");
                    dlist.id = [item.choices,ipair,idx].map(i=>i+'').join("_") ;
                        
                    item.choices.forEach( (c) => {
                        let op = document.createElement("option");
                        op.value = c;
                        dlist.appendChild(op);
                        });
                    let id = document.createElement("input");
                    id.type = "text";
                    id.setAttribute( "list", dlist.id );
                    id.value = v;
                    id.readonly = true;
                    id.disabled = true;
                    l.appendChild( dlist );
                    l.appendChild( id );                    
                    }
                    break;
                case "calclist":
                    {
                    // make the choice list generated by a query
                    // note the list is generated asynchronously, so will change dynamically
                    let dlist = document.createElement("datalist");
                    dlist.id = [item.choices,ipair,idx].map( i => i+'' ).join("_") ;
                    db.query(item.choices,{group:true,reduce:true})
                    .then( q => {
                        q.rows
                        .map( qq => qq.key )
                        .filter( c => c.length>0 )
                        .forEach( c => {
                            let op = document.createElement("option");
                            op.value = c;
                            dlist.appendChild(op);
                            });
                        }) ;

                    let v  = "";
                    if ( item.name in doc ) {
                        v = doc[item.name];
                    }
                        
                    let id = document.createElement("input");
                    id.type = "text";
                    id.setAttribute( "list", dlist.id );
                    id.value = v;
                    id.readonly = true;
                    id.disabled = true;
                    l.appendChild( dlist );
                    l.appendChild( id );                    
                    }
                    break;
                case "datetime":
                case "datetime-local":
                    {
                    let d = null;
                    if ( item.name in doc ) { 
                        d = new Date( doc[item.name] );
                    }
                    this.DateTimetoInput(d).forEach( (f) => l.appendChild(f) );
                    }
                    break;
                case "date":
                    {
                    let v  = "";
                    if ( item.name in doc ) { 
                        v = doc[item.name];
                    }
                        
                    let id = document.createElement("input");
                    id.type = "text";
                    id.pattern="\d+-\d+-\d+";
                    id.size = 10;
                    id.value = v;
                    id.title = "Date in format YYYY-MM-DD";
                    
                    l.appendChild(id);
                    }
                    break;
                case "time":
                    {
                    let v  = "";
                    if ( item.name in doc ) { 
                        v = doc[item.name];
                    }
                        
                    let it = document.createElement("input");
                    it.type = "text";
                    it.pattern="[0-1][0-9]:[0-5][0-9] [A|P]M";
                    it.size = 9;
                    it.value = v;
                    it.title = "Time in format HH:MM PM or HH:MM AM";
                    
                    l.appendChild(it);
                    }
                    break;
                case "length":
                    {
                    let v  = 0;
                    if ( item.name in doc ) { 
                        v = doc[item.name];
                    }
                        
                    let it = document.createElement("input");
                    it.type = "text";
                    it.pattern="\d+:[0-5][0-9]";
                    it.size = 6;
                    it.value = this.HMfromMin(v);
                    it.title = "Time length in format HH:MM";
                    
                    l.appendChild(it);
                    }
                    break;
                case "checkbox":
                    i = document.createElement("input");
                    i.type = item.type;
                    i.title = item.hint;
                    i.checked = doc[item.name];
                    i.disabled = true;
                    l.appendChild(i);
                    break;
                case "textarea" :
                    if ( i == null ) {
                        i = document.createElement("textarea");
                    }
                    // fall through
                default:
                    if ( i == null ) {
                        i = document.createElement("input");
                        i.type = item.type;
                    }
                    i.title = item.hint;
                    i.readOnly = true;
                    i.value = "";
                    if ( item.name in doc ) {
                        i.value = doc[item.name];
                    }
                    l.appendChild(i);
                    break;
            }                
            
            ul.appendChild( li );
        });
        
        return ul;
    }

    DateTimetoInput( d ) {
        let vdate;
        let vtime;
        try {
            [vdate, vtime] =  [ this.YYYYMMDDfromDate( d ), this.AMfrom24( d.getHours(), d.getMinutes() ) ];
            }
        catch( err ) {
            [vdate, vtime] = [ "", "" ];
            }
            
        let id = document.createElement("input");
        id.type = "text";
        id.size = 10;
        id.pattern="\d+-\d+-\d+";
        id.value = vdate;
        id.title = "Date in format YYYY-MM-DD";
        
        let it = document.createElement("input");
        it.type = "text";
        it.pattern="[0-1][0-9]:[0-5][0-9] [A|P]M";
        it.size = 9;
        it.value = vtime;
        it.title = "Time in format HH:MM AM or HH:MM PM";
        return [ id, it ];
    }

    DateTimefromInput( field ) {
        let i = field.querySelectorAll("input");
        try {
            var d =  this.YYYYMMDDtoDate( i[0].value ); // date
            
            try {
                let t = this.AMto24( i[1].value ); // time
                d.setHours( t.hr );
                d.setMinutes( t.min );
                } 
            catch( err ) {
                }
            // convert to local time
            return d.toISOString();
            }
        catch( err ) {
            return "";
            }
    }


    HMtoMin ( inp ) {
        if ( typeof inp != 'string' ) {
            throw "bad";
        }
        let d = inp.match( /\d+/g );
        if ( (d == null) || d.length < 2 ) {
            throw "bad";
        }
        return parseInt(d[0]) * 60 + parseInt(d[1]);
    }
        
    HMfromMin ( min ) {
        if ( typeof min == 'number' ) {
            return (Math.floor(min/60)+100).toString().substr(-2) + ":" + ((min%60)+100).toString().substr(-2);
        } else {
            return "00:00";
        }
    }
        
    AMto24( inp ) {
        if ( typeof inp != 'string' ) {
            throw "bad";
        }
        let d = inp.match( /\d+/g );
        if ( (d == null) || d.length < 2 ) {
            throw "bad";
        } else if ( /PM/i.test(inp) ) {
            return {
                hr: parseInt(d[0])+12,
                min: parseInt(d[1]),
            };
        } else {
            return {
                hr: parseInt(d[0]),
                min: parseInt(d[1]),
            };
        }
    }

    AMfrom24( hr, min ) {
        if ( hr < 13 ) {
            return (hr+100).toString().substr(-2) + ":" + (min+100).toString().substr(-2) + " AM";
        } else {
            return (hr+100-12).toString().substr(-2) + ":" + (min+100).toString().substr(-2) + " PM";
        }
    }

    YYYYMMDDtoDate( inp ) {
        if ( typeof inp != 'string' ) {
            throw "bad";
        }
        let d = inp.match( /\d+/g );
        if ( d.length < 3 ) {
            throw "bad";
        }
        return new Date( d[0],d[1],d[2] );
    }

    YYYYMMDDfromDate( d ) {
        if ( d instanceof Date ) {
            if ( d.getTime() > 0 ) {
                return [
                    d.getFullYear(),
                    d.getMonth(),
                    d.getDate(),
                    ].join("-");
            }
        }
        throw "bad";
    }

    toLocalString( d ) {
        if ( d instanceof Date ) {
            return new Date( d.getTime() - d.getTimezoneOffset()*1000 ).toISOString();
        } else {
            return "";
        }
    }

    ButtonStatus( bool ) {
        [...document.getElementsByClassName('savedata')].forEach( (e) => {
            e.disabled = bool;
        });
        [...document.getElementsByClassName('discarddata')].forEach( (e) => {
            e.disabled = bool;
        });
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
        this.ButtonStatus( false );
        for ( let ipair=0; ipair<this.pairs; ++ipair ) {
            let struct = this.struct[ipair];
            let ul     = this.ul[ipair];
            ul.querySelectorAll("li").forEach( (li) => {
                let idx = li.getAttribute("data-index");
                if ( ( "readonly" in struct[idx] ) && struct[idx].readonly == "true" ) {
                    return;
                }
                switch ( struct[idx].type ) {
                    case "radio":
                        document.getElementsByName(struct[idx].name).forEach( (i) => i.disabled = false );
                        break;
                    case "checkbox":
                        li.querySelector("input").disabled = false;
                        li.querySelector("input").readOnly = false;
                        break;
                    case "date":
                        picker.attach({
                            element: li.querySelector("input"),
                        });
                        break;
                    case "time":
                        tp.attach({
                            element: li.querySelector("input"),
                        });
                        break;
                    case "length":
                        lp.attach({
                            element: li.querySelector("input"),
                        });
                        break;
                    case "datetime":
                    case "datetime-local":
                        var i = li.querySelectorAll("input");
                        picker.attach({
                            element: i[0],
                        });
                        tp.attach({
                            element: i[1],
                        });
                        break;
                    case "textarea":
                        li.querySelector("textarea").readOnly = false;
                        break;
                    case "list":
                    case "calclist":
                        li.querySelector("input").readOnly = false;
                        li.querySelector("input").disabled = false;
                        break;
                    default:
                        li.querySelector("input").readOnly = false;
                        break;
                }
            });
        }
        [...document.getElementsByClassName("edit_note")].forEach( (e) => {
            e.disabled = true;
        });
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
                let v = "";
                let name = struct[idx].name;
                switch ( struct[idx].type ) {
                    case "radio":
                        document.getElementsByName(name).forEach( (i) => {
                            if ( i.checked == true ) {
                                v = i.value;
                            }
                        });
                        break;
                    case "datetime":
                    case "datetime-local":
                        v = this.DateTimefromInput( li );
                        break;
                    case "checkbox":
                        v = li.querySelector("input").checked;
                        break;
                    case "length":
                        v = this.HMtoMin( li.querySelector("input").value );
                        break;
                    case "textarea":
                        v = li.querySelector("textarea").value;
                        break;
                    default:
                        v = li.querySelector("input").value;
                        break;
                }
                if ( doc[name]==undefined || doc[name] != v ) {
                    changed[ipair] = true;
                    doc[name] = v;
                }
            });
        }
        return changed;
    }
    
    saveChanged ( state ) {
        let changed = this.loadDocData();
        Promise.all( this.doc.filter( (doc, idx) => changed[idx] ).map( (doc) => db.put( doc ) ) )
            .catch( (err) => console.log(err) )
            .finally( () => showPage( state )
        );
    }
    
    savePatientData() {
        this.saveChanged( "PatientPhoto" );
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

class DatabaseData extends PatientData {
    savePatientData() {
        if ( this.loadDocData()[0] ) {
            setCookie ( "remoteCouch", Object.assign({},this.doc[0]) );
            showPage( "MainMenu" );
        } else {
            showPage( "MainMenu" );
        }
        location.reload(); // force reload
    }
}

class NewPatientData extends PatientData {
    constructor(...args) {
        super(...args);
        this.clickEdit();
    }
    
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
            this.doc[0]._id = makePatientId( this.doc[0] );
            db.put( this.doc[0] )
            .then( (response) => {
                selectPatient(response.id);
                showPage( "PatientPhoto" );
                })
            .catch( (err) => console.log(err) );
        }
    }
}

class SuperUserData extends NewPatientData {
    savePatientData() {
        this.loadDocData();
        remoteAdmin.username = this.doc[0].username;
        remoteAdmin.password = this.doc[0].password;
        admin_db = setRemoteDB( remoteAdmin );
        // test connection
        getUsersAll( false )
        .then( doclist => showPage( "UserList" ) )
        .catch( err => {
            alert( err );
            showPage( "SuperUser" );
            });
    }
}

class NewUserData extends NewPatientData {
    savePatientData() {
        this.loadDocData();
        this.doc[0]._id = "org.couchdb.user:"+this.doc[0].name;
        this.doc[0].type = "user";
        this.doc[0].roles = [ this.doc[0].roles ];
        userPass[this.doc[0]._id] = this.doc[0].password; // for informing user
        admin_db.put( this.doc[0] )
        .then( response => {
            selectUser( response.id );
            showPage( "SendUser" );
            })
        .catch( err => {
            console.log(err);
            showPage( "UserList" );
            });
    }
}

class EditUserData extends PatientData {
    savePatientData() {
        if ( this.loadDocData()[0] ) {
            this.doc[0].roles = [ this.doc[0].roles ];
            userPass[this.doc[0]._id] = this.doc[0].password; // for informing user
            admin_db.put( this.doc[0] )
            .then( response => showPage( "SendUser" ) )
            .catch( err => {
                console.log(err);
                showPage( "UserList" );
                });
        } else if ( userId in userPass ) {
            showPage( "SendUser" );
        } else {
            // no password to send
            console.log("No password", userPass) ;
            showPage( "UserList" );
        }
    }
}

function getUsersAll(attachments) {
    let doc = {
        startkey: "org.couchdb.user:",
        endkey: "org.couchdb.user:\\fff0",
    } ;
    if (attachments) {
        doc.include_docs = true;
        doc.binary = true;
        doc.attachments = true;
    } else {
        doc.limit = 0;
    }
    return admin_db.allDocs(doc);
}

class Tbar {
    constructor() {
        this.is_active = false;
    }

    active() {
        // in edit mode already?
        return this.is_active;
    }

    enter() {
        this.is_active = true;
        this.buttonsdisabled(true);
    }
    
    leave(page) {
        this.is_active = false;
        this.buttonsdisabled(false);
        showPage(page);
    }

    fieldset( existingdiv, toolbarclass ) {
        this.existing = {};
        this.existing.parent  = existingdiv;
        this.existing.textDiv = existingdiv.querySelector( ".entryfield_text" );
        this.existing.oldText = "";
        this.existing.img     = existingdiv.querySelector( ".entryfield_image" );
        if ( this.existing.textDiv ) {
            this.existing.oldText = this.existing.textDiv.innerText;
        } else {
            this.existing.textDiv = document.createElement("div");
            this.existing.textDiv.classList.add("entryfield_text");
            this.existing.oldText = "";
        }

        this.working = {};
        this.working.parent  = existingdiv;
        this.working.toolbar = document.getElementById("templates").querySelector(toolbarclass).cloneNode(true);
        this.working.newText = this.existing.oldText;
        this.working.textDiv = document.createElement("div");
        this.working.textDiv.innerText = this.existing.oldText;
        this.working.textDiv.contentEditable = true;
        this.working.img     = document.createElement("img");
        this.working.img.classList.add("entryfield_image");
        this.working.img.onclick = ShowBigPicture(this);
        this.working.upload = null ;
    }

    buttonsdisabled( bool ) {
        for ( let b of document.getElementsByClassName( "libutton" ) ) {
            b.disabled = bool;
        }
        for ( let b of document.getElementsByClassName( "divbutton" ) ) {
            b.disabled = bool;
        }
    }

    deleteedit() {
        this.deletefunc();
        this.leave("NoteList");
    }

    getImage() {
        this.working.toolbar.querySelector(".imageBar").click();
    }

    handleImage() {
        const files = this.working.parent.querySelector('.imageBar') ;
        this.working.upload = files.files[0];
        this.working.img.src = URL.createObjectURL(this.working.upload);
        this.working.img.style.display = "block";
        this.working.toolbar.querySelector(".tbarxpic").disabled = false;
    }

    removeImage() {
        this.working.img.style.display = "none";
        this.working.upload = "remove";
        this.working.toolbar.querySelector(".tbarxpic").disabled = true;
    }
}

class Nbar extends Tbar {
    // for notes
    startedit( existingdiv ) {
        if ( this.active() ) {
            return false;
        }
        this.enter() ;
        if ( noteId ) {
            selectNote(existingdiv.getAttribute("data-id"));
            this.buttonsdisabled( true );
            this.deletefunc = deleteNote;
        } else {
            unselectNote();
            this.deletefunc = null;
        }
        this.fieldset( existingdiv, ".editToolbar" );
        if ( this.existing.textDiv == null ) {
            this.existing.textDiv = document.createElement("div");
            this.existing.textDiv.classList.add("entryfield_text");
            this.existing.oldText = "";
        }
            
        this.working.toolbar.querySelector(".tbarxpic").disabled = (this.existing.img  == null);
        this.working.toolbar.querySelector(".tbardel").style.visibility = (this.deletefunc!=null) ? "visible" : "hidden";

        if ( this.existing.img  ) {
            this.working.img.src = this.existing.img.src;
            this.working.img.style.display = "block";
        } else {
            this.working.img.style.display = "none";
        }

        // elements of the working fields
        this.working.parent.innerHTML = "";
        this.working.parent.appendChild(this.working.img );
        this.working.parent.appendChild(this.working.toolbar);
        this.working.parent.appendChild(this.working.textDiv);
        return true;
    }

    saveedit() {
        if ( this.active() ) {
            if ( noteId ) {
                // existing note
                db.get(noteId)
                .then( (doc) => {
                    doc.text = this.working.textDiv.innerText;
                    doc.patient_id = patientId;
                    doc.type = "note";
                    if ( this.working.upload == null ) {
                    } else if ( this.working.upload === "remove") {
                        deleteImageFromDoc( doc );
                    } else {
                        putImageInDoc( doc, this.working.upload.type, this.working.upload );
                    }
                    return db.put( doc );
                    })
                .catch( (err) => console.log(err) )
                .finally( () => this.leave("NoteList") );
            } else {
                // new note
                createNote(
                    this.working.upload && this.working.upload !== "remove" ? image : null,
                    this.working.textDiv.innerText )
                .catch( (err) => console.log(err) )
                .finally( () => this.leave("NoteList") );
            }
        }
    }
}
    
var editBar = new Nbar();        

class Pbar extends Tbar {
    // for PatientPhoto
    startedit() {
        let existingdiv = document.getElementById("PatientPhotoContent");
        if ( this.active() ) {
            return false;
        }
        this.enter();
        this.fieldset( existingdiv, ".photoToolbar" );
        this.working.textDiv.contentEditable = false;
            
        this.working.toolbar.querySelector(".tbarxpic").disabled = false;

        this.working.img.src = this.existing.img.src;
        this.working.img.style.display = "block";

        // elements of the working fields
        this.working.parent.innerHTML = "";
        this.working.parent.appendChild(this.working.img );
        this.working.parent.appendChild(this.working.toolbar);
        this.working.parent.appendChild(this.working.textDiv);
        return true;
    }

    removeImage() {
        this.working.upload = "remove";
        this.working.img.src = NoPhoto;
    }

    saveedit() {
        if ( this.active() ) {
            if ( patientId ) {
                getPatient( true )
                .then( (doc) => {
                    if ( this.working.upload == null ) {
                    } else if ( this.working.upload === "remove") {
                        deleteImageFromDoc( doc );
                    } else {
                        putImageInDoc( doc, this.working.upload.type, this.working.upload );
                    }
                    return db.put( doc );
                })
                .catch( (err)  => console.log(err) )
                .finally( () => this.leave("PatientPhoto") );
            }
        }
    }    
}
    
var photoBar = new Pbar();        

function selectPatient( pid ) {
    if ( patientId != pid ) {
        // change patient -- notes dont apply
        unselectNote();
    }
        
    setCookie( "patientId", pid );
    // Check patient existence
    getPatient(false)
    .then( (doc) => {
        // highlight the list row
        if ( objectPatientTable ) {
            objectPatientTable.highlight();
        }
        document.getElementById("editreviewpatient").disabled = false;
        document.getElementById( "titlebox" ).innerHTML = "Name: <B>"+doc.LastName+"</B>, <B>"+doc.FirstName+"</B>  DOB: <B>"+doc.DOB+"</B>";
        })
    .catch( (err) => {
        console.log(err);
        unselectPatient();
        });
}

function selectOperation( oid ) {
    if ( operationId != oid ) {
        // change patient -- notes dont apply
        unselectOperation();
    }
        
    setCookie ( "operationId", oid  );
    // Check patient existence
    // highlight the list row
    if ( objectOperationTable ) {
        objectOperationTable.highlight();
    }
    document.getElementById("editreviewoperation").disabled = false;
}

function selectUser( uid ) {
    userId = uid;
    if ( objectUserTable ) {
        objectUserTable.highlight();
    }
    document.getElementById("editreviewuser").disabled = false;
}    

function unselectPatient() {
    patientId = null;
    deleteCookie ( "patientId" );
    unselectNote();
    unselectOperation();
    if ( displayState == "PatientList" ) {
        let pt = document.getElementById("PatientTable");
        if ( pt ) {
            let rows = pt.rows;
            for ( let i = 0; i < rows.length; ++i ) {
                rows[i].classList.remove('choice');
            }
        }
    }
    document.getElementById("editreviewpatient").disabled = true;
    document.getElementById( "titlebox" ).innerHTML = "";
}

function unselectOperation() {
    operationId = null;
    deleteCookie( "operationId" );
    if ( displayState == "OperationList" ) {
        let ot = document.getElementById("OperationsList");
        if ( ot ) {
            let rows = ot.rows;
            for ( let i = 0; i < rows.length; ++i ) {
                rows[i].classList.remove('choice');
            }
        }
    }
    document.getElementById("editreviewoperation").disabled = true;
}

function unselectUser() {
    userId = null;
    document.getElementById("editreviewuser").disabled = true;
}

function showPage( state = "PatientList" ) {
    setCookie( "displayState", state );

    Array.from(document.getElementsByClassName("pageOverlay")).forEach( (v) => v.style.display = v.classList.contains(displayState) ? "block" : "none" );

    objectPatientData = null;
    objectNoteList = null;
    objectPatientTable = null;
    objectOperationTable = null;
    objectUserTable = null;

    switch( displayState ) {           
       case "MainMenu":
       case "Administration":
       case "Download":
            break;
            
        case "RemoteDatabaseInput":
            objectPatientData = new DatabaseData( Object.assign({},remoteCouch), structDatabase );
            break;
            
        case "SuperUser":
            remoteAdmin.address = remoteCouch.address;
            objectPatientData = new SuperUserData( Object.assign({},remoteAdmin), structSuperUser );
            break;
            
        case "UserList":
            objectUserTable = new UserTable( ["name", "role", "email", "type", ] );
            getUsersAll(true)
            .then( docs => objectUserTable.fill(docs.rows ) )
            .catch( (err) => console.log(err) );
            break;

        case "UserNew":
            unselectUser();
            objectPatientData = new NewUserData( {}, structNewUser );
            break;
            
        case "UserEdit":
            if ( admin_db == null ) {
                showPage( "SuperUser" );
            } else if ( userId == null ) {
                showPage( "UserList" );
            } else {
                admin_db.get( userId )
                .then( doc => {
                    doc.roles = doc.roles[0]; // unarray
                    objectPatientData = new EditUserData( doc, structEditUser );
                    })
                .catch( err => {
                    console.log( err );
                    unselectUser();
                    showPage( "UserList" );
                    });
            }
            break;
            
        case "SendUser":
            if ( admin_db == null ) {
                showPage( "SuperUser" );
            } else if ( userId == null || !(userId in userPass) ) {
                showPage( "UserList" );
            } else {
                admin_db.get( userId )
                .then( doc => sendUser( doc ) )
                .catch( err => {
                    console.log( err );
                    showPage( "UserList" );
                    });
            }
            break;
            
        case "PatientList":
            objectPatientTable = new PatientTable( ["LastName", "FirstName", "DOB","Dx" ] );
            getPatientsAll(true)
            .then( (docs) => {
                objectPatientTable.fill(docs.rows );
                if ( patientId ) {
                    selectPatient( patientId );
                } else {
                    unselectPatient();
                }
                })
            .catch( (err) => console.log(err) );
            break;
            
        case "OperationList":
            objectOperationTable = new OperationTable( [ "Procedure", "Surgeon", "Status", "Schedule", "Duration", "Equipment" ]  );
            getOperations(true)
            .then( (docs) => objectOperationTable.fill(docs.rows ) )
            .catch( (err) => console.log(err) );
            break;
            
        case "OperationNew":
            unselectOperation();
            showPage( "OperationEdit" );
            break;
        
        case "OperationEdit":
            if ( patientId ) {
                if ( operationId ) {
                    db.query("bySurgeon",{group:true,reduce:true})
                    .then( s => {
                        UniqueSurgeons = s.rows.map( ss => ss.key );
                        return db.get( operationId );
                        })
                    .then( (doc) => objectPatientData = new OperationData( doc, structOperation ) )
                    .catch( (err) => {
                        console.log(err);
                        showPage( "InvalidPatient" );
                        });
                } else {
                    objectPatientData = new OperationData(
                    {
                        _id: makeOperationId(),
                        patient_id: patientId,
                        author: remoteCouch.username,
                    } , structOperation );
                }
            } else {
                showPage( "PatientList" );
            }
            break;
            
        case "PatientNew":
            unselectPatient();
            objectPatientData = new NewPatientData( { author: remoteCouch.username, type:"patient" }, structNewPatient );
            break;
            
        case "PatientPhoto":
            if ( patientId ) {
                selectPatient( patientId );
                getPatient( true )
                .then( (doc) => PatientPhoto( doc ) )
                .catch( (err) => {
                    console.log(err);
                    showPage( "InvalidPatient" );
                    });
            } else {
                showPage( "PatientList" );
            }
            break;
            
        case "PatientDemographics":
            if ( patientId ) {
                getPatient( false )
                .then( (doc) => objectPatientData = new PatientData( doc, structDemographics ) )
                .catch( (err) => {
                    console.log(err);
                    showPage( "InvalidPatient" );
                    });
            } else {
                showPage( "PatientList" );
            }
            break;
            
        case "PatientMedical":
            if ( patientId ) {
                let args;
                db.query("bySurgeon",{group:true,reduce:true})
                .then( s => {
                    UniqueSurgeons = s.rows.map( ss => ss.key );
                    return getPatient( false ) ;
                    })
                .then( (doc) => {
                    args = [doc,structMedical];
                    return getOperations(true);
                    })
                .then( ( olist ) => {
                    olist.rows.forEach( (r) => args.push( r.doc, structOperation ) );
                    //objectPatientData = new PatientData( doc, structMedical );
                    objectPatientData = new PatientData( ...args );
                    })
                .catch( (err) => {
                    console.log(err);
                    showPage( "InvalidPatient" );
                    });
            } else {
                showPage( "PatientList" );
            }
            break;
            
        case "DatabaseInfo":
            db.info()
            .then( doc => {
                objectPatientData = new DatabaseInfoData( doc, structDatabaseInfo );
                })
            .catch( err => console.log(err) );
            break;

        case "InvalidPatient":
            unselectPatient();
            break;

        case "NoteList":            
            if ( patientId ) {
                getPatient( false )
                .then( () => getNotes(true) )
                .then( notelist => objectNoteList = new NoteList(notelist) )
                .catch( (err) => {
                    console.log(err);
                    showPage( "InvalidPatient" );
                    });
            } else {
                showPage( "PatientList" );
            }
            break;
            
         case "NoteNew":
            if ( patientId ) {
                // New note only
                unselectNote();
                NoteNew();
            } else {
                showPage( "PatientList" );
            }
            break;
            
       case "NoteImage":
            if ( patientId ) {
                NoteImage();
            } else {
                showPage( "PatientList" );
            }
            break;
            
        default:
            showPage( "PatientList" );
            break;
    }
}

function setCookie( cname, value ) {
  // From https://www.tabnine.com/academy/javascript/how-to-set-cookies-javascript/
    window[cname] = value;
    //console.log(cname,"value",value);
    let date = new Date();
    date.setTime(date.getTime() + (400 * 24 * 60 * 60 * 1000)); // > 1year
    const expires = " expires=" + date.toUTCString();
    document.cookie = cname + "=" + encodeURIComponent(JSON.stringify(value)) + "; " + expires + "; path=/";
}

function deleteCookie( cname ) {
    window[cname] = null;
    document.cookie = cname +  "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
}

function getCookie( cname ) {
    const name = cname + "=";
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
    //console.log("getcookie",cname,ret);
    return ret;
}

function isAndroid() {
    return navigator.userAgent.toLowerCase().indexOf("android") > -1;
}

class SortTable {
    constructor( collist, tableId ) {
        this.tbl = document.getElementById(tableId);
        this.tbl.innerHTML = "";

        // Table Head
        let header = this.tbl.createTHead();
        let row = header.insertRow(0);
        row.classList.add('head');
        collist.forEach( (v,i) => row.insertCell(i).outerHTML='<th>'+v+'</th>' );

        // Table Body
        let tbody = document.createElement('tbody');
        this.tbl.appendChild(tbody);
        this.collist = collist;

        this.dir = 1;
        this.lastth = -1;
        this.tbl.onclick = this.allClick.bind(this);
    }

    fill( doclist ) {
        // typically called with doc.rows from allDocs
        let tbody = this.tbl.querySelector('tbody');
        tbody.innerHTML = "";
        let collist = this.collist;
        doclist.forEach( (doc) => {
            let row = tbody.insertRow(-1);
            let record = doc.doc;
            row.setAttribute("data-id",record._id);
            row.addEventListener( 'click', (e) => {
                this.selectFunc( record._id );
            });
            row.addEventListener( 'dblclick', (e) => {
                this.selectFunc( record._id );
                showPage( this.editpage );
            });
            collist.forEach( (colname,i) => {
                let c = row.insertCell(i);
                if ( colname in record ) {
                    c.innerText = record[colname];
                } else {
                    c.innerText = "";
                }
            });
        });
        this.highlight();
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
        unselectPatient();
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
    }

    highlight() {
        let rows = this.tbl.rows;
        for ( let i = 0; i < rows.length; ++i ) {
            if ( rows[i].getAttribute("data-id") == this.selectId() ) {
                rows[i].classList.add('choice');
            } else {
                rows[i].classList.remove('choice');
            }
        }
    }
}

class PatientTable extends SortTable {
    editpage = "PatientPhoto";
    selectFunc = selectPatient;
    selectId = () => patientId;
    constructor( collist ) {
        super( collist, "PatientList" );
    }
}

function makeNewOperation() {
    let doc = {
        _id: makeOperationId(),
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

class OperationTable extends SortTable {
    editpage = "OperationEdit";
    selectFunc = selectOperation;
    selectId = () => operationId;
    constructor( collist ) {
        super( collist, "OperationsList");
    }
}

class UserTable extends SortTable {
    editpage = "UserEdit";
    selectFunc = selectUser;
    selectId = () => userId;
    constructor( collist ) {
        super( collist, "UserList");
    }
}

function makePatientId( doc ) {
    return [ 
        RecordFormat.type.patient,
        RecordFormat.version,
        doc.LastName,
        doc.FirstName,
        doc.DOB, 
        ].join(";");
}

function splitPatientId( pid = patientId ) {
    if ( pid ) {
        let spl = pid.split(";");
        if ( spl.length !== 5 ) {
            return null;
        }
        return {
            type: spl[0],
            version: spl[1],
            last : spl[2],
            first: spl[3],
            dob: spl[4],
        };
    }
    return null;
}

function makeNoteId() {
    const spl = splitPatientId();
        return [ 
        RecordFormat.type.note,
        RecordFormat.version,
        spl.last,
        spl.first,
        spl.dob,
        new Date().toISOString() , 
        ].join(";");
}

function makeOperationId() {
    const spl = splitPatientId();    
    return [ 
        RecordFormat.type.operation,
        RecordFormat.version,
        spl.last,
        spl.first,
        spl.dob,
        new Date().toISOString() , 
        ].join(";");
}

function splitNoteId( nid=noteId ) {
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
    }1
    return null;
}

function deletePatient() {
    if ( patientId ) {        
        let pdoc;
        let ndocs;
        let odocs;
        getPatient( true )
            // get patient
        .then( (doc) => {
            pdoc = doc;
            return getNotes(false);
            })
        .then( (docs) => {
            // get notes
            ndocs = docs.rows;
            return getOperations (false);
            })
        .then( (docs) => {
            // get operations
            odocs = docs.rows;
            // Confirm question
            let c = "Delete patient \n   " + pdoc.FirstName + " " + pdoc.LastName + " DOB: " + pdoc.DOB + "\n    ";
            if (ndocs.length == 0 ) {
                c += "(no associated notes on this patient) \n   ";
            } else {
                c += "also delete "+ndocs.length+" associated notes\n   ";
            }
            if (odocs.length == 0 ) {
                c += "(no associated operations on this patient) \n   ";
            } else {
                c += "also delete "+odocs.length+" associated operations\n   ";
            }
            c += "Are you sure?";
            if ( confirm(c) ) {
                return true;
            } else {
                throw "No delete";
            }           
            })
        .then( () => Promise.all(ndocs.map( (doc) => db.remove(doc.id,doc.value.rev) ) ) )
        .then( () => Promise.all(odocs.map( (doc) => db.remove(doc.id,doc.value.rev) ) ) )
        .then( () => db.remove(pdoc) )
        .then( () => unselectPatient() )
        .catch( (err) => console.log(err) ) 
        .finally( () => showPage( "PatientList" ) );
    }
}

function PatientPhoto( doc ) {
    let d = document.getElementById("PatientPhotoContent");
    let c = document.getElementById("phototemplate");
    d.innerHTML = "";
    c.childNodes.forEach( cc => {
        d.appendChild(cc.cloneNode(true) );
    });
    
    let p = document.getElementById("PatientPhotoContent").getElementsByTagName("img")[0];
    try {
        p.src = getImageFromDoc( doc );
        }
    catch( err ) {
        p.src = NoPhoto;
        }
    dropPictureinNote( d );
}

function newImage() {
    unselectNote();
    showPage( "NoteImage" );  
}

function deleteNote() {
    if ( noteId ) {
        let pdoc;
        getPatient( false )
        .then( (doc) => {
            pdoc = doc;
            return db.get( noteId );
            })
        .then( (doc) => {
            if ( confirm("Delete note on patient " + pdoc.FirstName + " " + pdoc.LastName + " DOB: " + pdoc.DOB + ".\n -- Are you sure?") ) {
                return doc;
            } else {
                throw "No delete";
            }           
            })
        .then( (doc) => db.remove(doc) )
        .then( () => unselectNote() )
        .catch( (err) => console.log(err) )
        .finally( () => showPage( "NoteList" ) );
    }
    return true;
}    
    
function deleteOperation() {
    if ( operationId ) {
        let pdoc;
        getPatient( false )
        .then( (doc) => { 
            pdoc = doc;
            return db.get( operationId );
            })
        .then( (doc) => {
            if ( confirm("Delete operation\<"+doc.Procedure+">\n on patient " + pdoc.FirstName + " " + pdoc.LastName + " DOB: " + pdoc.DOB + ".\n -- Are you sure?") ) {
                return doc;
            } else {
                throw "No delete";
            }           
            })
        .then( (doc) =>db.remove(doc) )
        .then( () => unselectOperation() )
        .catch( (err) => console.log(err) )
        .finally( () => showPage( "OperationList" ) );
    }
    return true;
}    
    
function selectNote( cid ) {
    setCookie( "noteId", cid );
    if ( displayState == "NoteList" ) {
        // highlight the list row
        let li = document.getElementById("NoteList").getElementsByTagName("LI");
        if ( li && (li.length > 0) ) {
            for ( let l of li ) {
                if ( l.getAttribute("data-id") == noteId ) {
                    l.classList.add('choice');
                } else {
                    l.classList.remove('choice');
                }
            }
        }
    }
}

function unselectNote() {
    deleteCookie ( "noteId" );
    if ( displayState == "NoteList" ) {
        let li = document.getElementById("NoteList").li;
        if ( li && (li.length > 0) ) {
            for ( let l of li ) {
                l.classList.remove('choice');
            }
        }
    }
}

function noteTitle( doc ) {
    let date = new Date().toISOString();
    let author = remoteCouch.username;
    if ( doc  && doc.id ) {
        date = splitNoteId(doc.id).key;
        //console.log( "from key", date );
        if ( doc.doc && doc.doc.author ) {
            author = doc.doc.author;
        }
        if ( doc.doc && doc.doc.date ) {
            date = doc.doc.date;
            //console.log( "from doc", date );
        }
    }
    return [author, new Date(date)];
}

function getPatient(attachments) {
    return db.get( patientId, { attachments: attachments, binary: attachments } );
}

function getPatientsAll(attachments) {
    let doc = {
        startkey: [ RecordFormat.type.patient, ""].join(";"),
        endkey:   [ RecordFormat.type.patient, "\\fff0"].join(";"),
    };
    if (attachments) {
        doc.include_docs = true;
        doc.binary = true;
        doc.attachments = true;
    }

    return db.allDocs(doc);
}

function getOperationsAll() {
    let doc = {
        startkey: [ RecordFormat.type.operation, ""].join(";"),
        endkey:   [ RecordFormat.type.operation, "\\fff0"].join(";"),
        include_docs: true,
        binary: true,
        attachments: true,
    };
    return db.allDocs(doc);
}

function getOperations(attachments) {
    let doc = {
        key: patientId,
    };
    if (attachments) {
        doc.include_docs = true;
        doc.binary = true;
        doc.attachments = true;

        // Adds a single "blank"
        // also purges excess "blanks"
        return db.query( "Patient2Operation", doc)
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
            //console.log("Remove", dlist.length,"entries");
            return Promise.all(dlist.map( (doc) => db.remove(doc) ))
                .then( ()=> getOperations( attachments )
                );
            })
        .catch( () => {
            //console.log("Add a record");
            return makeNewOperation().then( () => getOperations( attachments ) );
            });
    } else {
        return db.allDocs(doc);
    }
}

function sendUser( doc ) {
    document.getElementById("SendUserMail").href = "";
    let url = new URL( window.location.href );
    url.searchParams.append( "address", remoteCouch.address );
    url.searchParams.append( "database", remoteCouch.database );
    url.searchParams.append( "password", userPass[userId] );
    url.searchParams.append( "username", doc.name );
    new QR(
        document.getElementById("SendUserQR"),
        url.href,
        200,200,
        4);
    document.getElementById("SendUserEmail").value = doc.email;
    document.getElementById("SendUserLink").value = url.href;

    let mail_url = new URL( "mailto:" + doc.email );
    mail_url.searchParams.append( "subject", "Welcome to eMission" );
    mail_url.searchParams.append( "body",
        'Welcome, '+doc.name+', to eMission: \n'
        +'  software for managing medical missions in resource-poor environments.\n'
        +'\n'
        +'You have an account:\n'
        +'  web address: '+remoteCouch.address+'\n'
        +'  username: '+doc.name+'\n'
        +'  password: '+userPass[userId]+'\n'
        +'  database name: '+remoteCouch.database+'\n'
        +'\n'
        +'Full link (paste into your browser address bar):\n'
        +'  '+url.href+'\n'
        +'\n'
        +'We\'re looking forward to your participation.'
        ) ;
    document.getElementById("SendUserMail").href = mail_url.href;
}

function deleteUser() {
    if ( userId ) {
        admin_db.get( userId )
        .then( (doc) => {
            if ( confirm("Delete user" + doc.name + ".\n -- Are you sure?") ) {
                return admin_db.remove(doc) ;
            } else {
                throw "No delete";
            }
            })              
        .then( () => unselectUser() )
        .catch( (err) => console.log(err) )
        .finally( () => showPage( "UserList" ) );
    }
    return true;
}    
    
function getNotesAll() {
    let doc = {
        startkey: [ RecordFormat.type.note, ""].join(";"),
        endkey:   [ RecordFormat.type.note, "\\fff0"].join(";"),
        include_docs: true,
        binary: false,
        attachments: false,
    };
    return db.allDocs(doc);
}

function getNotes(attachments) {
    let doc = {
        key: patientId,
    };
    if (attachments) {
        doc.include_docs = true;
        doc.binary = true;
        doc.attachments = true;
    }
    return db.query( "Patient2Note", doc) ;
}

class NoteList extends PatientData {
    constructor( notelist ) {
        super();
        parent = document.getElementById("NoteListContent") ;
        parent.innerHTML = "" ;

        // show notes
        if ( notelist.rows.length == 0 ) {
            parent.appendChild( document.createTextNode("Add a note, picture, or drag an image here") ) ;
        } else {
            this.ul = document.createElement('ul');
            this.ul.setAttribute( "id", "NoteList" );
            parent.appendChild(this.ul);
            notelist.rows.forEach( note => {
                let li1 = this.liLabel(note);
                this.ul.appendChild( li1 );
                let li2 = this.liNote(note,li1);
                this.ul.appendChild( li2 );

                });
            this.li = this.ul.getElementsByTagName('li');
        }

        dropPictureinNote( parent );
    }

    liLabel( note ) {
        let li = document.createElement("li");
        li.setAttribute("data-id", note.id );

        li.appendChild( document.getElementById("templates").getElementsByClassName("edit_note")[0].cloneNode(true) );

        let cdiv = document.createElement("div");
        cdiv.classList.add("inly");
        let nt = noteTitle( note );
        this.DateTimetoInput(nt[1]).forEach( (i) => cdiv.appendChild(i) );
        cdiv.appendChild( document.createTextNode( " by "+nt[0]) );
        li.appendChild(cdiv);
        li.addEventListener( 'click', (e) => selectNote( note.id ) );

        return li;
    }

    liNote( note, label ) {
        let li = document.createElement("li");
        li.setAttribute("data-id", note.id );
        if ( noteId == note.id ) {
            li.classList.add("choice");
        }
        if ( "doc" in note ) {
            try {
                let imagedata = getImageFromDoc( note.doc );
                let img = document.createElement("img");
                img.classList.add("entryfield_image");
                img.addEventListener('click', (e) => ShowBigPicture(img) );
                img.src = imagedata;
                li.appendChild(img);
                }
            catch(err) {
                console.log(err);
                }

            let textdiv = document.createElement("div");
            textdiv.innerText = ("text" in note.doc) ? note.doc.text : "";
            li.addEventListener( 'dblclick', (e) => editBar.startedit( li ) );
            textdiv.classList.add("entryfield_text");
            li.appendChild(textdiv);
        }    
        
        li.addEventListener( 'click', (e) => {
            selectNote( note.id );
        });
        label.getElementsByClassName("edit_note")[0].onclick =
            (e) => {
            var i = label.querySelectorAll("input");
            picker.attach({ element: i[0] });
            tp.attach({ element: i[1] });
            selectNote( note.id );
            editBar.startedit( li );
            };
        label.addEventListener( 'dblclick', (e) => {
            var i = label.querySelectorAll("input");
            picker.attach({ element: i[0] });
            tp.attach({ element: i[1] });
            selectNote( note.id );
            editBar.startedit( li );
            });

        return li;
    }
}

function dropPictureinNote( target ) {
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
        Array.from(e.dataTransfer.files)
        .filter( file => file.type.match(/image.*/) )
        .forEach( file => {
            let reader = new FileReader();
            reader.onload = e2 =>
                fetch(e2.target.result)
                .then( b64 => b64.blob() )
                .then( blb => createNote( blb, "" ) )
                .catch( (err) => console.log(err) ) ;
            reader.readAsDataURL(file); // start reading the file data.
            });
        showPage( "NoteList" );
        });
}

function getImageFromDoc( doc ) {
    if ( !("_attachments" in doc) ) {
        throw "No attachments";
    }
    if ( !("image" in doc._attachments) ) {
        throw "No image";
    }
    if ( !("data" in doc._attachments.image) ) {
        throw "No image data";
    }
    return URL.createObjectURL(doc._attachments.image.data);
}

function deleteImageFromDoc( doc ) {
    if ( "_attachments" in doc ) {
        delete doc._attachments;
    }
}

function putImageInDoc( doc, itype, idata ) {
    doc._attachments = {
        image: {
            content_type: itype,
            data: idata,
        }
    };
}

function NoteNew() {
    document.getElementById("NoteNewLabel").innerHTML = noteTitle();
    let d = document.getElementById("NoteNewText");
    d.innerHTML = "";
    editBar.startedit( d );
}

function NoteImage() {
    let inp = document.getElementById("imageInput");
    if ( isAndroid() ) {
        inp.removeAttribute("capture");
    } else {
        inp.setAttribute("capture","environment");
    }
}

function quickImage() {
    document.getElementById("imageQ").click();
}

function createNote( image, text ) {
    // returns a promise
    let doc = {
        _id: makeNoteId(),
        text: "",
        author: remoteCouch.username,
        type: "note",
        patient_id: patientId,
        date: new Date().toISOString(),
    };
    console.log(image) ;
    if ( image ) {
        putImageInDoc( doc, image.type, image );
    }

    return db.put( doc ) ;
}

function quickImage2() {
    const files = document.getElementById('imageQ');
    const image = files.files[0];
    console.log(files);
    console.log(files.files);

    createNote( image, "" )
    .then( () => showPage( "NoteList" ) )
    .catch( (err) => {
        console.log(err);
        showPage( "NoteList" );
        });
}

function getImage() {
    let inp = document.getElementById("imageInput");
    inp.click();
}
    
   
//let urlObject;
function handleImage() {
    const files = document.getElementById('imageInput');
    const image = files.files[0];

    // change display
    document.getElementsByClassName("NoteImage")[0].style.display = "none";
    document.getElementsByClassName("NoteImage2")[0].style.display = "block";

     // see https://www.geeksforgeeks.org/html-dom-createobjecturl-method/
    document.getElementById('imageCheck').src = URL.createObjectURL(image);
}    

function saveImage() {
    const files = document.getElementById('imageInput');
    const image = files.files[0];
    const text = document.getElementById("annotation").innerText;

    createNote( image, text )
    .catch( (err) => console.log(err) )
    .finally( () => { 
        document.getElementById('imageCheck').src = "";
        showPage( "NoteList" );
        })
}

function show_screen( bool ) {
    document.getElementById("splash_screen").style.display = "none";
    Array.from(document.getElementsByClassName("work_screen")).forEach( (v)=> {
        v.style.display = bool ? "block" : "none";
    });
    Array.from(document.getElementsByClassName("print_screen")).forEach( (v)=> {
        v.style.display = bool ? "none" : "block";
    });
}    

function printCard() {
    if ( patientId == null ) {
        return showPage( "InvalidPatient" );
    }
    let card = document.getElementById("printCard");
    let t = card.getElementsByTagName("table");
    getPatient( true )
    .then( (doc) => {
        show_screen( false );
        console.log( "print",doc);
        let photo = document.getElementById("photoCard");
        let link = new URL(window.location.href);
        link.searchParams.append( "patientId", patientId );
        let qr = new QR(
            card.querySelector(".qrCard"),
            link.href,
            200,200,
            4);
        try {
            photo.src = getImageFromDoc( doc );
            //console.log("Image gotten".doc)
            } 
        catch (err) {
            photo.src = "style/NoPhoto.png";
            //console.log("No image",doc);
            }
        t[0].rows[0].cells[1].innerText = doc.LastName+"' "+doc.FirstName;
        t[0].rows[1].cells[1].innerText = doc.Complaint;
        t[0].rows[2].cells[1].innerText = "";
        t[0].rows[3].cells[1].innerText = "";
        t[0].rows[4].cells[1].innerText = "";
        t[0].rows[5].cells[1].innerText = doc.ASA;

        t[1].rows[0].cells[1].innerText = doc.Age+"";
        t[1].rows[1].cells[1].innerText = doc.Sex;
        t[1].rows[2].cells[1].innerText = doc.Weight+" kg";
        t[1].rows[3].cells[1].innerText = doc.Allergies;
        t[1].rows[4].cells[1].innerText = doc.Meds;
        t[1].rows[5].cells[1].innerText = "";
        return getOperations(true);
        })
    .then( (docs) => {
        let oleng = docs.rows.length;
        if ( oleng > 0 ) {
            t[0].rows[2].cells[1].innerText = docs.rows[oleng-1].doc.Procedure;
            t[0].rows[3].cells[1].innerText = docs.rows[oleng-1].doc.Duration + " hr";
            t[0].rows[4].cells[1].innerText = docs.rows[oleng-1].doc.Surgeon;
            t[1].rows[5].cells[1].innerText = docs.rows[oleng-1].doc.Equipment;
        }
        window.print();
        show_screen( true );
        showPage( "PatientPhoto" );
        })
    .catch( (err) => {
        console.log(err);
        showPage( "InvalidPatient" );
        });
}

function HideBigPicture( target ) {
    target.src = "";
    target.style.display = "none";
}

function ShowBigPicture( target ) {
    let big = document.getElementsByClassName( "FloatPicture" )[0];
    big.src = target.src;
    big.style.display = "block";
}

function downloadCSV(csv, filename) {
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

function downloadPatients() {
    const fields = [ "LastName", "FirstName", "DOB", "Dx", "Weight", "Height", "Sex", "Allergies", "Meds", "ASA" ]; 
    let csv = fields.map( f => '"'+f+'"' ).join(',')+'\n';
    getPatientsAll(true)
    .then( doclist => {
        csv += doclist.rows
            .map( row => fields
                .map( f => row.doc[f] || "" )
                .map( v => typeof(v) == "number" ? v : '"'+v+'"' )
                .join(',')
                )
            .join( '\n' );
        downloadCSV( csv, 'mdbPatient.csv' );
        });
}

function downloadAll() {
    const pfields = [ "LastName", "FirstName", "DOB", "Dx", "Weight", "Height", "Sex", "Allergies", "Meds", "ASA" ]; 
    const ofields = [ "Complaint", "Procedure", "Surgeon", "Equipment", "Status", "Date-Time", "Duration", "Lateratility" ]; 
    let csv = pfields
                .concat(ofields,["Notes"])
                .map( f => '"'+f+'"' )
                .join(',')+'\n';
    let plist;
    let olist = {};
    let nlist = {};
    getPatientsAll(true)
    .then( doclist => {
        plist = doclist.rows;
        plist.forEach( p => nlist[p.id] = 0 );
        return getOperationsAll();
        })
    .then ( doclist => {
        doclist.rows.forEach( row => {
            if ( new Date(row.doc["Date-Time"]) != "Invalid Date" ) {
                olist[row.doc.patient_id] = row.doc;
            }
            });
        return getNotesAll();
        })
    .then( doclist => {
        doclist.rows.forEach( row => ++nlist[row.doc.patient_id] );
        csv += plist
            .map( row =>
                pfields
                .map( f => row.doc[f] || "" )
                .map( v => typeof(v) == "number" ? v : '"'+v+'"' )
                .concat(
                    (row.id in olist) ? ofields
                                        .map( ff => olist[row.id][ff] || "" )
                                        .map( v => typeof(v) == "number" ? v : '"'+v+'"' )
                                        :
                                        ofields.map( ff => "" ) ,
                    [nlist[row.id]]
                    )
                .join(',')
                )
            .join( '\n' );
        downloadCSV( csv, 'mdbAllData.csv' );
        });
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

function setRemoteDB( DBstruct ) {
    if ( DBstruct && remoteFields.every( k => k in DBstruct )  ) {
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
        

var SyncHandler = null;
    
// Initialise a sync process with the remote server
var remoteDB;

function foreverSync() {
    remoteDB = setRemoteDB( remoteCouch ); // null initially
    document.getElementById( "userstatus" ).value = remoteCouch.username;
    if ( remoteDB ) {
        const synctext = document.getElementById("syncstatus");
        synctext.value = "syncing...";
            
        SyncHandler = db.sync( remoteDB ,
            {
                live: true,
                retry: true,
                filter: (doc) => doc._id.indexOf('_design') !== 0,
            } )
            .on('change', ()       => synctext.value = "changed" )
            .on('paused', ()       => synctext.value = "resting" )
            .on('active', ()       => synctext.value = "active" )
            .on('denied', (err)    => { synctext.value = "denied"; console.log("Sync denied",err); } )
            .on('complete', ()     => synctext.value = "stopped" )
            .on('error', (err)     => { synctext.value = err.reason ; console.log("Sync error",err); } );
    }
}

function forceReplicate(id=null) {
    if (SyncHandler) {
        SyncHandler.cancel();
        SyncHandler = null;
    }
    if (remoteDB) {
        db.replicate.to( remoteDB,
            {
                filter: (doc) => id ?
                    doc._id == id :
                    doc._id.indexOf('_design') !== 0,
            } )
        .catch( err => id ? console.log( id,err ) : console.log(err) )
        .finally( () => foreverSync() );
    }
}

function Setup() {
    getCookie ( "patientId" );
    getCookie ( "commentId" );
    getCookie ( "displayState" );
    getCookie ( "operationId" );

    // need to establish remote db and credentials
    // first try the search field
    const qline = parseQuery();
    
    // need remote database for sync
    if ( remoteFields.every( k => k in qline ) ) {
        remoteCouch = {};
        remoteFields.forEach( f => remoteCouch[f] = qline[f] );
        setCookie( "remoteCouch", remoteCouch );
    } else if ( getCookie( "remoteCouch" ) == null ) {
        showPage( "RemoteDatabaseInput" ); // forces reload
    }    

    // first try the search field
    if ( qline && ( "patientId" in qline ) ) {
        selectPatient( qline.patientId );
        return "PatientPhoto";
    }
    return displayState;
}

// Application starting point
window.onload = () => {
    // Initial start
    show_screen(true);

    const ds = Setup() ; // look for remoteCouch and other cookies

    // local copy
    db = new PouchDB( remoteCouch.database );

    db.changes({
        since: 'now',
        live: true
    }).on('change', (change) => {
        switch (displayState) {
            case "PatientList":
            case "OperationList":
            case "PatientPhoto":
                showPage( displayState );
                break;
            default:
                break;
        }
    });

    // start sync
    foreverSync();

    // design document creation (assync)
    createIndexes();

    db.viewCleanup()
    .catch( err => console.log(err) );
    
    // now jump to proper page
    switch ( ds ) {
        case "UserList":
        case "UserNew":
        case "UserEdit":
        case "SendUser":
        case "SuperUser":
            showPage ( "MainMenu" );
            break;
            
        case "PatientList":
        case "MainMenu":
        case "Administration":
        case "PatientPhoto":
        case "NoteList":
        case "OperationList":
        case "RemoteDatabaseInput":
        case "PatientDemographics":
        case "PatientMedical":
            showPage( ds );
            break;
        case "OperationEdit":
            showPage( "OperationList" );
            break;
        case "NoteNew":
        case "NoteImage":
            showPage( "NoteList" );
            break;
        case "PatientNew":
        case "InvalidPatient":
            showPage( "PatientList" );
            break;
        default:
            showPage( "PatientPhoto" );
            break;
    }
};
