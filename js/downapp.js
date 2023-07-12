"use strict";

/* jshint esversion: 6 */

// singleton class instances
var objectPatientData;
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
var NoPhoto = "style/NoPhoto.png";
var DCTOHClogo = "images/DCTOHC11.jpg";

// Database handles and  
var db ; // will be Pouchdb local copy 
var security_db = null ;
const remoteUser = {
    database: "_users" ,
    username: "admin",
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
            attachments: true,
            binary: false,
        };

        return db.allDocs(doc);
    }
        
    static getAllIdDocPix() {
        // Note: using base64 here
        let doc = {
            startkey: [ RecordFormat.type.patient, ""].join(";"),
            endkey:   [ RecordFormat.type.patient, "\\fff0"].join(";"),
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
                document.getElementById( "titlebox" ).innerHTML = doc.rows[0].value[1];
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

    static getRecordsIdPix( pid = patientId) {
        // Bse64 encoding
        let pspl = Patient.splitId(pid);
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
            binary: false,
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
        return db.allDocs(doc);
    }
    static splitId( oid=operationId ) {
        if ( nid ) {
            let spl = oid.split(";");
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

    static dateFromRow( doc ) {
        return ((doc["Date-Time"] ?? "") + Operation.splitId(doc._id).key).substring(0,24) ;
    }
}

class Mission { // convenience class
    static select() {
        patientId = missionId;
        Mission.getRecordId()
        .then( doc => document.getElementById( "titlebox" ).innerHTML = doc.Name ) ;
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
			doclist.rows.forEach( row => row.doc["Date-List"] = Operation.dateFromRow(row.doc) );
            olist = doclist.rows.filter( r => r.doc.Procedure !== "Enter new procedure" ) ;
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
        .then( doclist => {
			doclist.rows.forEach( row => row.doc["Date-List"] = Operation.dateFromRow(row.doc) );
            doclist.rows.forEach( row => olist[row.doc.patient_id] = row.doc ) ;
            })
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
    };
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
                console.log("Bad image format");
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
                .addNotes([doc?.text,doc._id,doc?.author,this.dateString(doc)].join("\n"))
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
            }
  
            })
        .then( _ => Promise.resolve(true) )
        ;
    }

    notelist( nlist ) {
        return PromiseSeq( 
            nlist.rows
            .sort((a,b)=>(a.doc?.date ?? Note.splitId(a.id).key).localeCompare((b.doc?.date ?? Note.splitId(b.id).key)))
            .map( r => {
                return _ => this.note(r.doc) ;
                })
            ) ;         
    }
    
    dateString( doc ) {
        let key = ["date","Date-Time"].find( k => k in doc );
        if ( key ) {
            return doc[key].substring(0,10);
        } else {
            return "";
        }
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
                .addNotes([doc?.text,doc._id,doc?.author,this.dateString(doc)].join("\n"))
                .addText(this.pname,{placeholder:"title",color:"e4e444",isTextBox:true,align:"center"})
                .addTable([[this.category(doc)],[this.dateString(doc)]],{x:6.6,y:.7,w:3.3,color:"e4e444",fontSize:28})
                ;

            if (img) {
                slide
                .addImage(Object.assign({x:0,y:.7},img))
                .addText(doc?.text,{x:6.6,y:2.2,h:3.4,w:3.3,color:"e4e444",fontSize:24,autofit:true,isTestBox:true})
                ;
            } else {
                slide
                .addText(doc?.text,{x:.5,y:2.2,h:3.4,w:7,color:"e4e444",fontSize:24,autofit:true,isTestBox:true})
            }
            })
        .then( _ => Promise.resolve(true) )
        ;
    }

    oplist( olist ) {
        return PromiseSeq( 
            olist.rows
            .filter( r => (r.doc.Procedure !== "Enter new procedure"))
            .sort((a,b)=>Operation.dateFromRow(a.doc).localeCompare(Operation.dateFromRow(b.doc)))
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
        .addNotes([doc?.Procedure,doc._id,doc?.author,this.dateString(doc)].join("\n"))
        .addText(this.pname,{placeholder:"title",color:"e4e444",isTextBox:true,align:"center"})
        .addTable([["Operation"],[this.dateString(doc)]],{x:6.6,y:.7,w:3.3,color:"e4e444",fontSize:28})
        .addTable(
            this.table(doc,["Procedure","Complaint","Surgeon","Equipment"]),
            {x:.5,y:1,w:6,fill:"114cc6",color:"ffffff",fontSize:24})
        ;
        return Promise.resolve(true);
    }
}   

class Page { // singleton class
    constructor() {
        this.safeLanding = [
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

        // clear old image urls
        ImageImbedded.clearSrc() ;

        if ( db == null || remoteCouch.database=='' ) {
            // can't bypass this! test if database exists
            if ( state != "FirstTime" ) {
                this.next("RemoteDatabaseInput");
            }
        }
        
        console.log("Page: ",objectPage.current());

        switch( objectPage.current() ) {  
            case "Download":
            case "DownloadCSV":
            case "DownloadJSON":
                Mission.select();
                // Pure menus
                break;
                
            case "DownloadPPTX":
                Mission.select();
                objectPPTX = new PPTX() ;
                // Pure menus
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

        // remove redundant mission buttons
        [...document.querySelectorAll(".topButtons")]
        .filter(d => d.querySelector(".missionLogo"))
        .forEach( d => d.removeChild(d.querySelector(".missionButton")));
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
