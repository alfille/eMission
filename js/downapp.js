"use strict";

/* jshint esversion: 11 */

// singleton class instances
var objectNoteList={};
    objectNoteList.category = 'Uncategorized' ;
var objectRemote = null;
var objectLog = null;
var objectPPTX = null;

// globals cookie backed
var objectPage ;
var patientId;
var noteId;
var operationId;
var remoteCouch;

// Database handles and  
var db ; // will be Pouchdb local copy 

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

}

class Patient { // convenience class
    static getRecordId(id=patientId ) {
        return db.get( id );
    }

    static getRecordIdPix(id=patientId ) {
        return db.get( id, { attachments:true, binary:false } );
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
            attachments: true,
            binary: false,
        };

        return db.allDocs(doc);
    }
        
    static getAllIdDocPix() {
        // Note: using base64 here
        let doc = {
            startkey: Id_patient.allStart(),
            endkey:   Id_patient.allEnd(),
            include_docs: true,
            binary: false,
            attachments: true,
        };

        return db.allDocs(doc);
    }

    static select( pid = patientId ) {
        patientId = pid ;
        if ( pid == missionId ) {
            Mission.select() ;
        } else {
            Cookie.set( "patientId", pid );
            // Check patient existence
            db.query("Pid2Name",{key:pid})
            .then( (doc) => {
                // highlight the list row
                TitleBox([doc.rows[0].value[1]]) ;
                })
            .catch( (err) => {
                objectLog.err(err,"patient select");
                });
        }
    }

    static splitId( pid = patientId ) {
        if ( pid ) {
            let spl = pid.split(";");
            if ( spl.length !== 5 ) {
                console.log("Bad Id_patient",pid);
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

    static getRecordsId() {
        let doc = {
            startkey: Id_note.patStart(pid),
            endkey: Id_note.patEnd(pid),
        };
        return db.allDocs(doc) ;
    }

    static getRecordsIdDoc() {
        let doc = {
            startkey: Id_note.patStart(pid),
            endkey: Id_note.patEnd(pid),
            include_docs: true,
        };
        return db.allDocs(doc) ;
    }

    static getRecordsIdPix( pid = patientId) {
        // Bse64 encoding
        let doc = {
            startkey: Id_note.patStart(pid),
            endkey: Id_note.patEnd(pid),
            include_docs: true,
            binary: false,
            attachments: true,
        };
        return db.allDocs(doc) ;
    }

    static dateFromDoc( doc ) {
        return ((doc["date"] ?? "") + Id_note.splitId(doc._id).key).substring(0,24) ;
    }
}

class Operation { // convenience class
    static getAllIdDoc() {
        let doc = {
            startkey: Id_operation.allStart(),
            endkey:   Id_operation.allEnd(),
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
        return db.allDocs(doc);
    }


    static dateFromDoc( doc ) {
        return ((doc["Date-Time"] ?? "") + Id_operation.splitId(doc._id).key).substring(0,24) ;
    }
    
    static nullOp( doc ) {
        return doc.Procedure == "Enter new procedure" ;
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
        return db.get( missionId, { attachments: true, binary: false } )
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
    // Access to remote (cloud) version of database
    constructor() {
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

class DownloadFile { // convenience class
    static download(contents, filename, htype ) {
        //htype the file type i.e. text/csv
        let downloadFile = new Blob([contents], {type: htype});
        let downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(downloadFile);
        downloadLink.style.display = "none";

        document.body.appendChild(downloadLink);
        downloadLink.click(); // press invisible button
        
        // clean up
        // Add "delay" see: https://www.stefanjudis.com/snippets/how-trigger-file-downloads-with-javascript/
        setTimeout( () => {
            window.URL.revokeObjectURL(downloadLink.href) ;
            document.body.removeChild(downloadLink) ;
        });
    }
}

class CSV { // convenience class
    static download(csv, filename) {
        DownloadFile.download( csv, filename, 'text/csv' ) ;
    }

    static patients() {
        // Just Patient records
        const fields = [ "LastName", "FirstName", "DOB", "Dx", "Weight", "Height", "Sex", "Allergies", "Meds", "ASA" ];
        // First line titles 
        let csv = fields.map( f => '"'+f+'"' ).join(',')+'\n';
        // Add data
        Patient.getAllIdDoc()
        .then( doclist => { // full list of patients
            csv += doclist.rows
                .map( row => fields // per wanted field
                    .map( f => row.doc[f] ?? "" ) // get data
                    .map( v => typeof(v) == "number" ? v : `"${v}"` ) // data formatted
                    .join(',')
                    )
                .join( '\n' );
            CSV.download( csv, `${remoteCouch.database}Patients.csv` ); // Send to download file
            });
    }

    static operations() {
        // Just real operation records
        // Add Patient name too
        const fields = [ "Procedure", "Surgeon", "Date-Time", "Status", "Equipment", "Complaint", "Duration", "Lateratility" ]; 
        // First line titles 
        let csv = ['"Patient"'].concat(fields.map( f => '"'+f+'"' )).join(',')+'\n';
        // Add data
        let olist = null;
        Operation.getAllIdDoc()
        .then( doclist => {
            doclist.rows.forEach( row => row.doc["Date-List"] = Operation.dateFromDoc(row.doc) );
            olist = doclist.rows.filter( r => ! Operation.nullOp(r.doc) ) ;
            })
        .then( _ => db.query( "Pid2Name", {keys:olist.map(r=>r.doc.patient_id)} ))
        .then( nlist => {
            const names = {};
            nlist.rows.forEach( n => names[n.key] = n.value[0] ) ;
            csv += olist
                .map( row => [`"${names[row.doc.patient_id]}"`].concat(
                        fields // per wanted field
                        .map( f => row.doc[f] ?? "" ) // get data
                        .map( v => typeof(v) == "number" ? v : `"${v}"` )) // data formatted
                    .join(',')
                    )
                .join( '\n' );
            CSV.download( csv, `${remoteCouch.database}Operations.csv` ); // Send to download file
            });
    }

    static all() {
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
            })
        .then( _ => Operation.getAllIdDoc() )
        .then( doclist =>
            doclist.rows.forEach( row => {
                row.doc["Date-List"] = Operation.dateFromDoc(row.doc) ;
                olist[row.doc.patient_id] = row.doc ;
                })
            )
        .then( _ => Note.getAllIdDoc() )
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
            CSV.download( csv, `${remoteCouch.database}AllData.csv` );
            });
    }
}

class Backup {
    static download( j, filename ) {
        DownloadFile.download( j, filename, 'application/json' ) ;
    }
    
    static all() {
        db.allDocs({
            include_docs: true,
            attachments: true,
            binary: false,
            })
        .then( doclist => 
            Backup.download(
                JSON.stringify(doclist.rows.map(({doc}) => doc)),
                `${remoteCouch.database}.json`
                )
            );
    }
}

// From https://bigcodenerd.org/resolving-promises-sequentially-javascript/
function PromiseSeq( promiseArray ) {
    return promiseArray
    .reduce( (prev, task) => {
        return prev
        .then( task )
        .catch( err => console.log(err) )
        } , 
        Promise.resolve(true) ) ;
}
        
class PPTX {
    layout='LAYOUT_16x9';
    w_layout = 10;
    h_layout = 5.625;
    
    constructor() {
        this.pptx = new PptxGenJS() ;
        this.pname = "mission notes";
        this.button = document.getElementById("createPresentation");
        this.button.innerText = "Create presentation";
        this.numpats = 0 ;       
    }
        
    master( mission_doc ) {
        // Synchonous
        this.pptx.author=remoteCouch.username;
        this.pptx.company=mission_doc.Organization;
        this.pptx.subject=mission_doc.Location;
        this.pptx.title=mission_doc.Mission;
        // w:10" h:5.625"
        this.pptx.layout=this.layout ;
        let slMa = {
            title:"Template",
            background: {color:"172bae"},
            objects:[
                { placeholder: { 
                    options: {name:"title",type:"title",x:2.3,y:0,w:5.4,h:.5,autofit:true,color:"e4e444"},
                }}, 
                {image: {x:0,y:0,h:.5,w:2,path:"images/emission11-web-white.jpg",}},
                ],
            };
        let img = mission_doc?._attachments?.image ;
        if ( img ) {
            slMa.objects.push({image:{x:8,y:0,h:.5,w:2,data:`${img.content_type};base64,${img.data}`}});
        }
        this.pptx.defineSlideMaster(slMa);
        // 
    }       

    imageWH( width, height, attach_img ) {
        // Assynchronous
        // returns { data:, h:, w: sizing:{} } adjusted for aspect ratio
        if ( attach_img ) {
            let img = new Image();
            img.src = `data:${attach_img.content_type};base64,${attach_img.data}` ;
            return img.decode()
            .then( _ => {
                let h = height ;
                let w = img.naturalWidth * height / img.naturalHeight ;
                if ( w > width ) {
                    w = width ;
                    h = img.naturalHeight * width / img.naturalWidth ;
                }
                return Promise.resolve(({h:h,w:w,data:`${attach_img.content_type};base64,${attach_img.data}`,sizing:{type:"contain",h:h,w:w}}));
                })
            .catch( err =>{
                console.log("Bad image format " + err);
                return Promise.resolve(null);
                });
        } else {
            return Promise.resolve(null) ;
        }
    }
    
    print() {
        // Synchronous -- creates presentation
        this.add_notes = document.getElementById("notesPPTX").checked ;
        this.add_ops = document.getElementById("opsPPTX").checked ;
        
        // https://github.com/gitbrent/PptxGenJS/issues/1217

        // powerpoint object
        Mission.getRecordId()
        .then( doc => {
            this.master( doc ) ;
            this.mission( doc ) ;
            })
        // mission notelist
        .then( _ => this.add_notes ? Note.getRecordsIdPix( missionId ) : Promise.resolve( ({ rows:[]}) ) )
        .then( notes => this.notelist( notes ) )
        // patient list
        .then( _ => Patient.getAllIdDocPix() )
        .then( doclist => {
            this.numpats = doclist.rows.length ;
            this.pat = 0 ;
            // For each patient:
            return PromiseSeq(
                doclist.rows.map( pt => {
                    // Get pretty name
                    return _ => 
                    db.query( "Pid2Name", {key:pt.id} )
                    .then( q => {
                        this.pname = q.rows[0].value[0] ;
                        return this.patient( pt.doc ) ;
                        })
                    // Get operations
                    .then( _ => this.add_ops ? Operation.getRecordsIdDoc( pt.id ) : Promise.resolve( ({ rows:[]}) ) )
                    .then( ops => this.oplist( ops ) )
                    // Get notes
                    .then( _ => this.add_notes ? Note.getRecordsIdPix( pt.id ) : Promise.resolve( ({ rows:[]}) ) )
                    .then( notes => this.notelist( notes ) )
                    .catch( err => console.log(err) ) ;
                    }));
                })
        .then( () => {
            this.button.innerText = "Writing..." ;
            return this.pptx.writeFile( { filename: `${remoteCouch.database}.pptx`, compression:true });
            })
        .then( () => {this.button.innerText = "Complete!";});
    }
    
    mission( doc ) {
        // Synchronous -- creates title slide
        this.pptx
        .addSlide({masterName:"Template"})
        .addText(doc.Mission,{x:"5%",y:"45%",fontSize:60, align:"center", color:"FFFFFF"})
        .addText(doc._id,{color:"dddddd"})
        ;
    }
    
    patient( doc ) {
        ++this.pat ;
        this.button.innerText = `${this.pat} of ${this.numpats}`;
        let att = doc?._attachments?.image ;
        return this.imageWH( Math.min(3.3,this.w_layout-6.6), Math.min(5.25,this.h_layout-.7), att )
        .then( (img) => {
            let slide = this.pptx
                .addSlide({masterName:"Template"})
                .addNotes([doc?.text,doc._id,doc?.author].join("\n"))
                .addText(this.pname,{placeholder:"title",color:"e4e444",isTextBox:true,align:"center"})
                .addTable(
                    this.table(doc,["DOB","Height","Weight","Sex","Meds","Allergies"]),
                    {x:.5,y:1,w:6,fill:"114cc6",color:"ffffff",fontSize:24})
                ;

            if (img) {
                slide
                .addImage(Object.assign({x:6.6,y:.7},img))
                ;
            } else {
                slide
                ;
            }
  
            })
        .then( _ => Promise.resolve(true) ) ;
    }

    notelist( nlist ) {
        return PromiseSeq( 
            nlist.rows
            .sort((a,b)=>Note.dateFromDoc(a.doc).localeCompare(Note.dateFromDoc(b.doc)))
            .map( r => this.note(r.doc) )
            ) ;         
    }
    
    category( doc ) {
        let cat = doc ?. category ;
        if ( cat ) {
            switch ( cat ) {
                case "Uncategorized":
                    return "General Note";
                case "Op Note":
                    return cat ;
                default:
                    return `${cat} Note`;
                }
        } else {
            return "General Note";
        }
    }

    note( doc ) {
        let att = doc?._attachments?.image ;
        return this.imageWH( Math.min(6.5,this.w_layout), Math.min(5.25,this.h_layout-.7), att )
        .then( (img) => {
            let slide = this.pptx
                .addSlide({masterName:"Template"})
                .addNotes([doc?.text,doc._id,doc?.author,Note.dateFromDoc(doc).substring(0,10)].join("\n"))
                .addText(this.pname,{placeholder:"title",color:"e4e444",isTextBox:true,align:"center"})
                .addTable([[this.category(doc)],[Note.dateFromDoc(doc).substring(0,10)]],{x:6.6,y:.7,w:3.3,color:"e4e444",fontSize:28})
                ;

            if (img) {
                slide
                .addImage(Object.assign({x:0,y:.7},img))
                .addText(doc?.text,{x:6.6,y:2.2,h:3.4,w:3.3,color:"e4e444",fontSize:24,autofit:true,isTestBox:true})
                ;
            } else {
                slide
                .addText(doc?.text,{x:.5,y:2.2,h:3.4,w:7,color:"e4e444",fontSize:24,autofit:true,isTestBox:true})
                ;
            }
            })
        .then( _ => Promise.resolve(true) )
        ;
    }

    oplist( olist ) {
        return PromiseSeq( 
            olist.rows
            .filter( r => ! Operation.nullOp(r.doc) )
            .sort((a,b)=>Operation.dateFromDoc(a.doc).localeCompare(Operation.dateFromDoc(b.doc)))
            .map( r => {
                return _ => this.operation(r.doc) ;
                })
            ) ;         
    }

    table( doc, fields ) {
        return fields
        .map( f => [
                {text: `${f}:`, options: {align:"right",color:"bfbfbf"} },
                (f in doc) ? doc[f]:""
            ]
            );
    }

    operation( doc ) {
        this.pptx
        .addSlide({masterName:"Template"})
        .addNotes([doc?.Procedure,doc._id,doc?.author,Operation.dateFromDoc(doc).substring(0,10)].join("\n"))
        .addText(this.pname,{placeholder:"title",color:"e4e444",isTextBox:true,align:"center"})
        .addTable([["Operation"],[Operation.dateFromDoc(doc).substring(0,10)]],{x:6.6,y:.7,w:3.3,color:"e4e444",fontSize:28})
        .addTable(
            this.table(doc,["Procedure","Complaint","Surgeon","Equipment"]),
            {x:.5,y:1,w:6,fill:"114cc6",color:"ffffff",fontSize:24})
        ;
        return Promise.resolve(true);
    }
}   

class Page { // singleton class
    constructor() {
        // get page history from cookies
        // much simplified from app.js -- no checking of entries or history
        // since any unrecognized entries send us back to app.js
        this.path = Cookie.get( "displayState" );
        this.lastscreen = null ; // splash/screen/patient for show_screen
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
        }
        Cookie.set ( "displayState", this.path ) ;
    }

    test( page ) {
        return this.current()==page ;
    }

    link() {
        window.open( new URL(`/book/${this.current()}.html`,location.href).toString(), '_blank' );
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
        if ( type !== this.lastscreen ) {
            this.lastscreen == type ;
            document.getElementById("splash_screen").style.display = "none";
            let showscreen = {
                ".work_screen": type=="screen",
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
        document.querySelectorAll(".topButtons")
            .forEach( tb => tb.style.display = "block" );

        document.querySelectorAll(".pageOverlay")
            .forEach( po => po.style.display = po.classList.contains(this.name) ? "block" : "none" );

        this.subshow(extra);
    }
    
    static subshow(extra="") {
        // default version, linkderived classes may overrule
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

class Download extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    
    static subshow(extra="") {
        Mission.select();
    }
}

class DownloadCSV extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    
    static subshow(extra="") {
        Mission.select();
    }
}

class DownloadJSON extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    
    static subshow(extra="") {
        Mission.select();
    }
}

class DownloadPPTX extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    
    static subshow(extra="") {
        Mission.select();
        objectPPTX = new PPTX() ;
    }
}

class ErrorLog extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        objectLog.show() ;
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

function TitleBox( titlearray=null, show="PatientPhoto" ) {
    if ( titlearray == null ) {
        document.getElementById( "titlebox" ).innerHTML = "" ;
    } else {
        document.getElementById( "titlebox" ).innerHTML = `<button type="button" onClick='objectPage.show("${show}")'>${titlearray.join(" ")}</button>` ;
    }
}

// Create pouchdb indexes.
// Used for links between records and getting list of choices
// change version number to force a new version
function createQueries() {
    let ddoclist = [
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
    Cookie.get ( "noteId" );
    objectPage = new Page();
    Cookie.get ( "operationId" );
    
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
        document.querySelectorAll(".headerboxlink")
        .forEach(q => q.addEventListener("click",()=>objectPage.show("MainMenu")));

        // start sync with remote database
        objectRemote.foreverSync();
        
        // Secondary indexes
        createQueries();
        db.viewCleanup()
        .catch( err => objectLog.err(err,"View cleanup") );

        // now jump to proper page
        objectPage.show( null ) ;

        // Set patient, operation and note -- need page shown first
        if ( Patient.isSelected() ) { // mission too
            Patient.select() ;
        }

    } else {
        db = null;
        objectPage.reset();
        objectPage.show("FirstTime");
    }

};
