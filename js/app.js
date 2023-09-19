"use strict";

/* jshint esversion: 11 */

// singleton class instances
var objectPatientData;
var objectNoteList={};
    objectNoteList.category = 'Uncategorized' ;
var objectTable = null;
var objectSearch = null;
var objectRemote = null;
var objectCollation = null;
var objectLog = null;

// globals cookie backed
var objectPage ;
var patientId;
var noteId;
var operationId;
var remoteCouch;

// other globals
var in_frame = false ;
var frame_name = "" ;
var NoPhoto = "style/NoPhoto.png";
var DCTOHClogo = "images/DCTOHC11.jpg";

// Database handles and  
var db ; // will be Pouchdb local copy 

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

const structMission = [
    {
        name: "Logo",
        hint: "logo for this organization/mission -- ~150x50 pixels",
        type: "image",
        none: DCTOHClogo,
    } , 
    {
        name: "Name",
        hint: "Name of Mission",
        type: "text",
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
        name: "Emergency",
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
        if ( ! in_frame && (doc?.type in this.fieldlist) ) {
            this.index[doc.type].addDoc(
                this.fieldlist[doc.type]
                .concat("_id")
                .reduce( (o,k) => {o[k]=doc[k]??"";return o;}, {})
                );
        }
    }

    removeDocById( doc_id ) {
        // we don't have full doc. Could figure type from ID, but easier (and more general) to remove from all.
        if ( ! in_frame ) {
            this.types.forEach( ty => this.index[ty].removeDocByRef( doc_id ) );
        }
    }

    fill() {
        if ( in_frame ) {
            return Promise.resolve(true) ;
        } else {
            // adds docs to index
            return db.allDocs( { include_docs: true, } )
            .then( docs => docs.rows.forEach( r => this.addDoc( r.doc ) ));
        }
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
            objectLog.err(err);
            this.resetTable();
            });
    }

    setTable() {
        objectTable.fill(this.result);
    }
}

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

class ImageNote extends ImageImbedded {
    constructor( ...args ) {
        super( ...args );
        this.text = this.doc?.text ?? "";
        this.title = this.doc?.title ?? "";
        this.category = this.doc?.category ?? "";
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

    display_text() {
        this.parent.querySelector(".entryfield_text").innerText = this.text;
        this.parent.querySelector(".entryfield_title").innerText = this.title;
        this.parent.querySelector("select").value = this.category;
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
        this.display_image();
        this.display_text();
    }

    addListen() {
        super.addListen();
        try { this.parent.querySelector( ".imageSave").addEventListener( 'click', () => this.store() ); }
            catch { //empty
                }
        try { this.parent.querySelector( ".imageCancel").addEventListener( 'click', () => this.leave() ); }
            catch { //empty
                }
        try { this.parent.querySelector( ".imageDelete").addEventListener( 'click', () => this.delete() ); }
            catch { //empty
                }
    }

    buttonsdisabled( bool ) {
        document.querySelectorAll(".libutton" ).forEach( b => b.disabled=bool );
        document.querySelectorAll(".divbutton").forEach( b => b.disabled=bool );
    }

    save(doc) {
        super.save(doc);
        doc.text = this.parent.querySelector(".entryfield_text").innerText;
        doc.title = this.parent.querySelector(".entryfield_title").innerText;
        doc.category = this.parent.querySelector("select").value;
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

class ImageQuick extends ImageImbedded {
    addListen(hfunc) {
        try { this.parent.querySelector( ".imageGet").addEventListener( 'click', () => objectPage.show('QuickPhoto') ); }
            catch { //empty
                }
        try { this.parent.querySelector( ".imageBar").addEventListener( 'change', () => hfunc() ); }
            catch { //empty
                }
    }
}

class ImageDrop extends ImageImbedded { // can only save(doc)
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

class MissionData extends PatientData {
    saveChanged ( state ) {
        let changed = this.loadDocData();
        if ( changed[0] ) {
            db.put( this.doc[0] )
            .then( _ => objectCollation.db.get( '0'+remoteCouch.database ) )
            .then( doc => {
                doc.dbname = remoteCouch.database;
                doc.server = remoteCouch.address;
                ["Organizatoin","Name","Location","StartDate","endDate","Mission","Link"].forEach(k=> doc[k]=this.doc[0][k]);
                return doc ;
                })
            .then( doc => objectCollation.db.put(doc) )
            .catch( (err) => objectLog.err(err) )
            .finally( () => objectPage.show( state ) );
        }
    }
     savePatientData() {
        this.saveChanged( "MainMenu" );
    }
}    

class OperationData extends PatientData {
    savePatientData() {
        this.saveChanged( "OperationList" );
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
            this.doc[0].DOB = new Date().toISOString();
        } else {
            // create new patient record
            this.doc[0]._id = Id_patient.makeId( this.doc[0] );
            this.doc[0].patient_id = this.doc[0]._id;
            db.put( this.doc[0] )
            .then( (response) => {
                Patient.select(response.id);
                objectPage.show( "PatientPhoto" );
                })
            .catch( (err) => objectLog.err(err) );
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
            .then( (doc) => pdoc = doc ) // patient
            .then( _ => Note.getRecordsIdDoc(patientId) ) // notes
            .then( (docs) => ndocs = docs.rows ) // get notes
            .then( _ => Operation.getRecordsIdDoc(patientId) ) // operations
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
                if (odocs.length < 2 ) {
                    c += "(no associated operations on this patient) \n   ";
                } else {
                    c += `also delete ${odocs.length-1} associated operations\n   `;
                }
                c += "Are you sure?";
                if ( confirm(c) ) {
                    return true;
                } else {
                    throw "No delete";
                }           
                })
            .then( _ => Promise.all(ndocs.map( (doc) => db.remove(doc.doc._id,doc.doc._rev) ) ) )
            .then( _ => Promise.all(odocs.map( (doc) => db.remove(doc.doc._id,doc.doc._rev) ) ) )
            .then( _ => db.remove(pdoc) )
            .then( _ => Patient.unselect() )
            .catch( (err) => objectLog.err(err) ) 
            .finally( _ => objectPage.show( "AllPatients" ) );
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
            endkey:   Id_patient.allEnd(),
        };

        return db.allDocs(doc);
    }
        
    static getAllIdDoc() {
        let doc = {
            startkey: Id_patient.allStart(),
            endkey:   Id_patient.allEnd(),
            include_docs: true,
        };

        return db.allDocs(doc);
    }
        
    static getAllIdDocPix() {
        let doc = {
            startkey: Id_patient.allStart(),
            endkey:   Id_patient.allEnd(),
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
                TitleBox([doc.rows[0].value[1]]);
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
        if ( objectPage.test("AllPatients") ) {
            let pt = document.getElementById("PatientTable");
            if ( pt ) {
                let rows = pt.rows;
                for ( let i = 0; i < rows.length; ++i ) {
                    rows[i].classList.remove('choice');
                }
            }
        }
        TitleBox();
    }

    static menu( doc, notelist, onum=0 ) {
        let d = document.getElementById("PatientPhotoContent2");
        let inp = new ImageImbedded( d, doc, NoPhoto );

        cloneClass( ".imagetemplate", d );
        inp.display_image();
        Patient.buttonSub( "nOps", onum );
        NoteLister.categorize(notelist);
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
            let img = new ImageImbedded( card, doc, NoPhoto ) ;
            img.display_image();
            let link = new URL(window.location.href);
            link.searchParams.append( "patientId", patientId );

            new QR(
                card.querySelector(".qrCard"),
                link.href,
                195,195,
                4);
            // patient parameters
            t[0].rows[0].cells[1].innerText = ""; // name
            t[0].rows[1].cells[1].innerText = ""; // procedure
            t[0].rows[2].cells[1].innerText = ""; // surgeon
            t[0].rows[3].cells[1].innerText = DateMath.age(doc.DOB); 
            t[0].rows[4].cells[1].innerText = doc.Sex??""; 
            t[0].rows[5].cells[1].innerText = doc.Weight+" kg"??"";
            t[0].rows[6].cells[1].innerText = ""; // equipment
            }) 
        .then( _ => db.query("Pid2Name",{key:patientId}) )
        .then( (doc) => t[0].rows[0].cells[1].innerText = doc.rows[0].value[0] )
        .then( _ => Operation.getRecordsIdDoc(patientId) )
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
                t[0].rows[1].cells[1].innerText = docs.rows[oleng].doc.Procedure??"";
                t[0].rows[2].cells[1].innerText = docs.rows[oleng].doc.Surgeon??"";
                t[0].rows[6].cells[1].innerText = docs.rows[oleng].doc.Equipment??"";
            }
            document.getElementById("printCardButtons").style.display="block";
            objectPage.show_screen( "patient" ); // Also prints
            })
        .catch( (err) => {
            objectLog.err(err);
            objectPage.show( "PatientPhoto" );
            });
    }
    
    static ActuallyPrint() {
        Mission.getRecordId()
        .then( doc => printJS({
            printable:"printCard",
            type:"html",
            ignoreElements:["printCardButtons"],
            documentTitle:[doc.Name,doc.Location,doc.Organization].join(" "),
            onPrintDialogClose: ()=>objectPage.show("PatientPhoto"),
            })
        );
    }
}

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

class Note { // convenience class
    static getAllIdDoc() {
        let doc = {
            startkey: Id_note.allStart(),
            endkey:   Id_note.allEnd(),
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
            if ( objectPage.test("NoteList") || objectPage.test("NoteListCategory") || objectPage.test("MissionList")) {
                objectNoteList.select() ;
            }
            })
        .catch( err => objectLog.err(err,"note select"));
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
                    .then( () => Note.getRecordsId(patientId) ) // refresh the list
                    .catch( err => objectLog.err(err,"Photo drop") )
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
            _id: Id_note.makeId(),
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
            .then( () => Note.getRecordsId(patientId) ) // to try to prime the list
            .catch( err => objectLog.err(err) )
            .finally( objectPage.show( null ) );
        }
        img.display_image();
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
            objectLog.err(err,"operation select");
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
            .finally( () => objectPage.show( "OperationList" ) );
        }
        return true;
    }    
        
    static getAllIdDoc() {
        let doc = {
            startkey: Id_operation.allStart(),
            endkey:   Id_operation.allEnd(),
            include_docs: true,
        };
        return db.allDocs(doc);
    }

    static getAllIdDocCurated() {
        // only real cases or placeholder if no others for that paitent
        return Operation.getAllIdDoc()
        .then( doclist => {
            const pids = new Set(
                doclist.rows
                .filter( r => ! Operation.nullOp(r.doc) )
                .map( r => r.doc.patient_id ) 
                );
            return doclist.rows
                   .filter( r => (! Operation.nullOp(r.doc)) || (!pids.has( r.doc.patient_id )) ) ;
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

class Mission { // convenience class
    static select() {
        Patient.unselect();
        patientId = missionId;
        Mission.getRecordId()
        .then( doc => TitleBox([doc.Mission,doc.Organization],"MissionInfo") ) ;
    }
    
    static getRecordId() {
        // return the Mission record, or a dummy
        // returns a promise, but can't fail!
        return db.get( missionId, { attachments: true, binary: true } )
        .then( doc => Promise.resolve(doc) )
        .catch( _ => Promise.resolve({
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
    // Access to remote (cloud) version of database
    constructor( qline ) {
        this.remoteFields = [ "address", "username", "password", "database" ];
        this.remoteDB = null;
        this.problem = false ; // separates real connection problem from just network offline
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
        

        // set up monitoring
        window.addEventListener("offline", _ => this.not_present() );
        window.addEventListener("online", _ => this.present() );

        // initial status
        navigator.onLine ? this.present() : this.not_present() ;
    }
    
    present() {
        this.status( "good", "--network present--" ) ;
    }

    not_present() {
        this.status( "disconnect", "--network offline--" ) ;
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
                document.body.style.background="#7071d3"; // Orange
                if ( this.lastState !== state ) {
                    objectLog.err(msg,"Network status");
                }
                break ;
            case "problem":
                document.body.style.background="#d72e18"; // grey
                objectLog.err(msg,"Network status");
                this.problem = true ;
                break ;
            case "good":
            default:
                document.body.style.background="#172bae"; // heppy blue
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
            objectLog.err("Bad DB specification");
            return null;
        }
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
        if ( ! in_frame ) {
            // Don't store values for in-frame instances -- it get's too confusing
            window[cname] = value;
            let date = new Date();
            date.setTime(date.getTime() + (400 * 24 * 60 * 60 * 1000)); // > 1year
            document.cookie = `${cname}=${encodeURIComponent(JSON.stringify(value))}; expires=${date.toUTCString()}; SameSite=None; Secure; path=/`;
        }
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

class Pagelist {
    // list of subclasses = displayed "pages"
    // Note that these classes are never "instantiated -- only used statically
    static pages = {} ; // [pagetitle]->class -- pagetitle is used by HTML to toggle display of "pages"
    // prototype to add to pages
    static AddPage() { Pagelist.pages[this.name]=this; }
    // safeLanding -- safe to resume on this page
    static safeLanding = true ; // default
    
    static show(extra="") {
        // set up specific page display
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
            // bad entry -- fix by making MainMenu the default
            objectPage.next("MainMenu") ;
            return MainMenu ;
        }
    } 
}

class Administration extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        window.location.href="/admin.html" ;
    }
}
class DatabaseInfo extends Administration {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
}
class MissionMembers extends Administration {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here
}
class PrintYourself extends Administration {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
}
class PatientMerge extends Administration {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
}
class RemoteDatabaseInput extends Administration {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here
}
class SendUser extends Administration {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here
}
class SuperUser extends Administration {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
}
class UserEdit extends Administration {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here
}
class UserList extends Administration {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here
}
class UserNew extends Administration {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here
}

class Help extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        window.open( new URL(`/book/index.html`,location.href).toString(), '_blank' );
        objectPage.show("MainMenu");
    }
}

class AllOperations extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        Patient.unselect();
        let olist;
        Operation.getAllIdDocCurated()
        .then( doclist => olist = doclist)
        .then( _ => db.query( "Pid2Name",{keys:olist.map(r=>r.doc.patient_id),}))  
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
        .catch( err=>objectLog.err(err) );
    }
}

class AllPatients extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding = false ;

    static subshow(extra="") {
        objectTable = new PatientTable();
        let o2pid = {} ; // oplist
        Operation.getAllIdDocCurated()
        .then( oplist => {
            oplist.forEach( r => o2pid[r.doc.patient_id] = ({
                "Procedure": r.doc["Procedure"],
                "Date-Time": Operation.dateFromDoc(r.doc),
                "Surgeon": r.doc["Surgeon"],
                }))
            })
        .then( _ => Patient.getAllIdDoc() )
        .then( (docs) => {
            docs.rows.forEach( r => Object.assign( r.doc, o2pid[r.id]) );
            objectTable.fill(docs.rows );
            if ( Patient.isSelected() ) {
                Patient.select( patientId );
            } else {
                Patient.unselect();
            }
            })
        .catch( (err) => objectLog.err(err) );
    }
}

class DBTable extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        objectTable = new DatabaseTable();
        objectCollation.db.allDocs( {
            startkey: '0',
            endkey:   '1',
            include_docs: true,
            })
        .then( (docs) => {
            objectTable.fill(docs.rows) ;
            })
        .catch( (err) => objectLog.err(err) );
    }
}

class Download extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        window.location.href="/download.html" ;
    }
}
class DownloadCSV extends Download {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
}
class DownloadJSON extends Download {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
}
class DownloadPPTX extends Download {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
}

class ErrorLog extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        objectLog.show() ;
    }
}

class FirstTime extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        if ( db !== null ) {
            objectPage.show("MainMenu");
        }
    }
}

class InvalidPatient extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        Patient.unselect();
    }
}

class MainMenu extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
}

class MissionInfo extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
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
    }
}

class MissionList extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        Mission.select() ;
        Mission.getRecordId()
        .then( () => Note.getRecordsIdPix(patientId) )
        .then( notelist => objectNoteList = new NoteLister(notelist,'Uncategorized') )
        .catch( ()=> objectPage.show( "MissionInfo" ) ) ;
    }
}

class NoteListCategory extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        if ( Patient.isSelected() ) {
            Note.getRecordsIdPix(patientId)
            .then( notelist => objectNoteList = new NoteLister(notelist,extra) )
            .catch( (err) => {
                objectLog.err(err,`Notelist (${extra})`);
                onjectPage.show( "InvalidPatient" );
                });
        } else {
            objectPage.show( "AllPatients" );
        }
    }
}

class NoteList extends NoteListCategory {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        super.subshow('Uncategorized');
    }
}

class NoteNew extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        if ( Patient.isSelected() ) {
            // New note only
            Note.unselect();
            Note.create();
        } else if ( patientId == missionId ) {
            Note.unselect();
            Note.create();
        } else {
            objectPage.show( "AllPatients" );
        }
    }
}

class OperationEdit extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        if ( operationId ) {
            db.get( operationId )
            .then ( doc => {
                Patient.select( doc.patient_id ); // async set title
                return doc ;
                })
            .then( (doc) => objectPatientData = new OperationData( doc, structOperation ) )
            .catch( (err) => {
                objectLog.err(err);
                objectPage.show( "InvalidPatient" );
                });
        } else if ( ! Patient.isSelected() ) {
            objectPage.show( "AllPatients" );
        } else {
            objectPatientData = new OperationData(
            {
                _id: Id_operation.makeId(),
                type: "operation",
                patient_id: patientId,
                author: remoteCouch.username,
            } , structOperation );
        }
    }
}

class OperationList extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        if ( Patient.isSelected() ) {
            objectTable = new OperationTable();
            Operation.getRecordsIdDoc(patientId)
            .then( (docs) => objectTable.fill(docs.rows ) )
            .catch( (err) => objectLog.err(err) );
        } else {
            objectPage.show( "AllPatients" ) ;
        }
    }
}

class OperationNew extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        if ( Patient.isSelected() ) {
            Operation.unselect();
            objectPage.show( "OperationEdit" );
        } else {
            objectPage.show( "AllPatients" ) ;
        }
    }
}

class PatientDemographics extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        if ( Patient.isSelected() ) {
            Patient.getRecordIdPix()
            .then( (doc) => objectPatientData = new PatientData( doc, structDemographics ) )
            .catch( (err) => {
                objectLog.err(err);
                objectPage.show( "InvalidPatient" );
                });
        } else {
            objectPage.show( "AllPatients" );
        }
    }
}

class PatientMedical extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        if ( Patient.isSelected() ) {
            let args;
            Patient.getRecordId()
            .then( (doc) => args = [doc,structMedical] )
            .then( _ => Operation.getRecordsIdDoc(patientId) )
            .then( ( olist ) => {
                olist.rows.forEach( (r) => args.push( r.doc, structOperation ) );
                objectPatientData = new PatientData( ...args );
                })
            .catch( (err) => {
                objectLog.err(err);
                objectPage.show( "InvalidPatient" );
                });
        } else {
            objectPage.show( "AllPatients" );
        }
    }
}

class PatientNew extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        Patient.unselect();
        objectPatientData = new NewPatientData(
            {
                author: remoteCouch.username,
                type:"patient"
            }, structNewPatient );
    }
}

class PatientPhoto extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        if ( Patient.isSelected() ) {
            Patient.select( patientId );
            let pdoc;
            let onum ;
            Patient.getRecordIdPix()
            .then( (doc) => pdoc = doc )
            .then( _ => Operation.getRecordsIdDoc(patientId) )
            .then ( (doclist) => onum = doclist.rows.filter( r=> ! Operation.nullOp(r.doc) ).length )
            .then( _ => Note.getRecordsIdDoc(patientId) )
            .then ( (notelist) => Patient.menu( pdoc, notelist, onum ) )
            .catch( (err) => {
                objectLog.err(err);
                objectPage.show( "InvalidPatient" );
                });
        } else {
            objectPage.show( "AllPatients" );
        }
    }
}

class QuickPhoto extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    static safeLanding  = false ; // don't return here

    static subshow(extra="") {
        objectPage.forget(); // don't return here!
        if ( patientId ) { // patient or Mission!
            Note.quickPhoto(this.extra);
        } else {
            objectPage.show( "AllPatients" );
        }
    }
}

class SearchList extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        objectTable = new SearchTable() ;
        objectSearch.setTable();
    }
}

class SelectPatient extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        document.getElementById("headerbox").style.display = "none"; // make less confusing
        document.getElementById("titlebox").style.display = "none"; // make less confusing
        document.getElementById("footerflex").style.display = "none"; // make less confusing
        objectTable = new SelectPatientTable();
        let onum= {} ;
        let nnum = {} ;
        Operation.getAllIdDoc() // Operations
        .then( doclist => doclist.rows
            .forEach( d => {
                let p = d.doc.patient_id;
                if (p in onum ) {
                    ++ onum[p];
                } else {
                    onum[p] = 0 ; // excludes placeholders
                }
                }))
        .then( _ => Note.getAllIdDoc() ) // Notes
        .then( doclist => doclist.rows
            .forEach( d => {
                let p = d.doc.patient_id;
                if (p in nnum ) {
                    ++ nnum[p];
                } else {
                    nnum[p] = 1 ;
                }
                }))
        .then( _ => Patient.getAllIdDoc() ) // Patients
        .then( (docs) => {
            docs.rows
            .forEach( d => {
                d.doc.Operations = onum[d.id]??0 ;
                d.doc.Notes = nnum[d.id]??0 ;
            })
            objectTable.fill(docs.rows );
            })
        .catch( (err) => objectLog.err(err) );
    }
}

class Page { // singleton class
    constructor() {
        // get page history from cookies
        const path = Cookie.get( "displayState" );
        this.lastscreen = null ; // splash/screen/patient for show_screen
        this.path=[];
        if ( Array.isArray(path) ) {
            if ( objectPage ) {
                // review pages to make sure "landable"          
                for( const p of path.filter(p => Pagelist.subclass(p).safeLanding) ) {
                    if ( this.path.includes(p) ) {
                        break ;
                    } else {
                        this.path.push(p);
                    }
                }
            }
        }
        // default last choice
        this.path.push("MainMenu");
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
        if ( Pagelist.subclass(this.path[0]).safeLanding ) {
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
    
    show( state = "AllPatients", extra="" ) { // main routine for displaying different "pages" by hiding different elements
        // test that database is selected
        if ( db == null || remoteCouch.database=='' ) {
            // can't bypass this! test if database exists
            if ( state != "FirstTime" && state!="RemoteDatabaseInput" ) {
                this.show("RemoteDatabaseInput");
            }
        }

        this.next(state) ; // update reversal list

        if ( in_frame ) { // imbedded, only show SelectPatient
            if ( state != "SelectPatient" ) {
                this.show("SelectPatient") ;
            }
        } else if ( this.current() == "SelectPatient" ) {
            this.show("MainMenu");
        }

        // clear display objects
        objectPatientData = null;
        objectTable = null;

        // clear old image urls
        ImageImbedded.clearSrc() ;
        ImageImbedded.clearSrc() ;

        this.show_screen( "screen" ); // basic page display setup

        // send to page-specific code
        (Pagelist.subclass(objectPage.current())).show(extra);
    }
    
    show_screen( type ) { // switch between screen and print
        if ( type !== this.lastscreen ) {
            this.lastscreen == type ;
            document.getElementById("splash_screen").style.display = "none";
            let showscreen = {
                ".work_screen": type=="screen",
                ".print_patient": type == "patient",
            };
            for ( let cl in showscreen ) {
                document.querySelectorAll(cl)
                .forEach( (v)=> v.style.display=showscreen[cl]?"block":"none"
                );
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

objectPage = new Page();

function isAndroid() {
    return navigator.userAgent.toLowerCase().indexOf("android") > -1;
}

function TitleBox( titlearray=null, show="PatientPhoto" ) {
    if ( titlearray == null ) {
        document.getElementById( "titlebox" ).innerHTML = "" ;
    } else {
        document.getElementById( "titlebox" ).innerHTML = `<button type="button" onClick='objectPage.show("${show}")'>${titlearray.join(" ")}</button>` ;
    }
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

class SelectPatientTable extends SortTable {
    constructor() {
        super( 
            ["LastName", "DOB","Operations","Notes" ], 
            "SelectPatient",
            [
                ["LastName","Name", (doc)=> `${doc.LastName}, ${doc.FirstName}`],
                ["Operations","Op",null],
                ["Notes","Note",null],
            ] 
            );
        this.pid = "";
    }

    selectId() {
        return this.pid;
    }

    selectFunc(id) {
        this.pid = id
        db.get(id)
        .then( doc => window.top.postMessage({
            frame: frame_name,
            doc: doc,
        },"*"));
    }

    editpage() {
        //objectPage.show("PatientPhoto");
    }
}

class DatabaseTable extends SortTable {
    constructor() {
        super( 
            ["Name","Organization","Location","file"], 
            "DBTable" ,
            [
                ["file","Filename",(doc)=>doc._id.substring(1)],
            ] 
            );
         // starting databaseId
        this.databaseId = this.makeId( remoteCouch.database ) ;
        this.loadedId = this.databaseId ;
        // set titlebox
        objectCollation.db.get(this.databaseId)
        .then( (doc) => TitleBox([doc.Name,doc.Location,doc.Organization,`<I>${this.databaseId.substring(1)}</I>`],"MissionInfo") )
        .catch( _ => Mission.select() ) ;
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
    }

    editpage() {
        // select this database and reload
        if ( this.databaseId != this.loadedId ) {
            // changed!
            objectCollation.db.get(this.databaseId)
            .then( (doc) => {
                remoteCouch.address = doc.server ;
                remoteCouch.database = doc.dbname ;
                Patient.unselect();
                Cookie.set( "remoteCouch", Object.assign({},remoteCouch) ) ;
                })
            .catch( (err) => objectLog.err(err,"Loading patient database") )
            .finally( () => {
                objectPage.reset();
                window.location.href="/index.html"; // force reload
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
            ["Date-Time","Date",(doc)=>Operation.dateFromDoc(doc).substring(0,10)]
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
            ["Date-Time","Date",(doc)=>Operation.dateFromDoc(doc).substring(0,10)]
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
                    case 'mission':
                        Mission.select( id );
                        objectPage.show( 'MissionInfo' ) ;
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
                objectLog.err(err);
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

class NoteLister {
    constructor( notelist, category="Uncategorized" ) {
        this.category = category;
        if ( category == "" ) {
            this.category = "Uncategorized" ;
        }
        NoteLister.categorize(notelist);

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
        return Note.dateFromDoc(row.doc).substr(0,4);
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
        li.querySelector(".flatpickr").value = flatpickr.formatDate(new Date(Note.dateFromDoc(note.doc)),"Y-m-d h:i K");
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
            img.display_image();
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
}

class Collation {
    constructor() {
        this.db = new PouchDB( 'databases' );
        PouchDB.sync( 'https://emissionsystem.org:6984/databases', this.db, { live:true, retry:true } ) ;
    }
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
        if ( objectPage.current() == "ErrorLog" ) {
            // update
            this.show()
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
        // clear cookies
        Cookie.del( "patientId" );
        Cookie.del( "remoteCouch");
        Cookie.del( "operationId");
        Cookie.del( "noteId" );
        // clear (local) database
        db.destroy()
        .finally( _ => {
            objectPage.reset();
            location.reload(); // force reload
            });
    } else {
        objectPage.show( "MainMenu" );
    }
}

function cookies_n_query() {
    Cookie.get ( "patientId" );
    Cookie.get ( "noteId" );
    //objectPage = new Page();
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

    // frame
    if ( qline && ( "frame" in qline ) ) {
        frame_name = qline.frame;
    } else if ( Object.keys(qline).length > 0 ) {
        // reload without search params -- placed in Cookies
        window.location.href = "/index.html" ;
    }
}

// Application starting point
window.onload = () => {
    Page.setButtons(); // load some common html elements
    document.querySelectorAll(".headerboxlink")
    .forEach( q => q.addEventListener("click",()=>objectPage.show("MainMenu")));

    if ( window.frameElement ) {
        in_frame = true ;
    }

    // Stuff into history to block browser BACK button
    window.history.pushState({}, '');
    window.addEventListener('popstate', ()=>window.history.pushState({}, '') );

    // Service worker (to manage cache for off-line function)
    if ( 'serviceWorker' in navigator ) {
        navigator.serviceWorker
        .register('/sw.js')
        .catch( err => objectLog.err(err,"Service worker registration") );
    }
    
    // set state from URL or cookies
    cookies_n_query() ; // look for remoteCouch and other cookies

    // database list
    objectCollation = new Collation();

    // Start pouchdb database       
    if ( remoteCouch.database !== "" ) {
        db = new PouchDB( remoteCouch.database, {auto_compaction: true} ); // open local copy

        // Set up text search
        objectSearch = new Search();
        objectSearch.fill()
        .then ( _ =>
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
                if ( in_frame ) {
                    objectPage.show("SelectPatient");
                } else {
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
                            } else if ( objectPage.test("AllOperations") && change.doc?.patient_id==patientId ) {
                                objectPage.show("AllOperations");
                            }
                            break;
                    }
                }
                })
            )
        .catch( err => objectLog.err(err,"Initial search database") );

        // start sync with remote database
        objectRemote.foreverSync();

        // set link for mission
        Mission.link();

        // Secondary indexes
        createQueries();
        db.viewCleanup()
        .catch( err => objectLog.err(err,"Query cleanup") );

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
