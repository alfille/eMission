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
    } from "./log_mod.js" ;

import {
    SimplePatient,
    SimpleNote,
    SimpleOperation,
    } from "./simple_mod.js" ;
    
import {
    } from "./replicate_mod.js" ;

objectPatient = new SimplePatient() ;

objectNote = new SimpleNote() ;

objectOperation = new SimpleOperation() ;

class Mission { // convenience class
    static select() {
        patientId = missionId;
        Mission.getRecordId()
        .then( doc => TitleBox([doc.Mission,doc.Organization],"MissionInfo") ) ;
    }
    

    static getRecordId(binary=false) {
        // return the Mission record, or a dummy
        return db.get( missionId, { attachments: true, binary: binary } )
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

class DownloadFile { // convenience class
    static file(contents, filename, htype ) {
        //htype the file type i.e. text/csv
        const blub = new Blob([contents], {type: htype});
        this.blob( blub, filename ) ;
    }

    static blob(blub, filename ) {
        //htype the file type i.e. text/csv
        const link = document.createElement("a");
        link.download = filename;
        link.href = window.URL.createObjectURL(blub);
        link.style.display = "none";

        document.body.appendChild(link);
        link.click(); // press invisible button
        
        // clean up
        // Add "delay" see: https://www.stefanjudis.com/snippets/how-trigger-file-downloads-with-javascript/
        setTimeout( () => {
            window.URL.revokeObjectURL(link.href) ;
            document.body.removeChild(link) ;
        });
    }
}

class CSV { // convenience class
    static download(csv, filename) {
        DownloadFile.file( csv, filename, 'text/csv' ) ;
    }

    static patients() {
        // Just Patient records
        const fields = [ "LastName", "FirstName", "DOB", "Dx", "Weight", "Height", "Sex", "Allergies", "Meds", "ASA" ];
        // First line titles 
        let csv = fields.map( f => '"'+f+'"' ).join(',')+'\n';
        // Add data
        objectPatient.getAllIdDoc()
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
        objectOperation.getAllIdDoc()
        .then( doclist => {
            doclist.rows.forEach( row => row.doc["Date-List"] = objectOperation.dateFromDoc(row.doc) );
            olist = doclist.rows.filter( r => ! objectOperation.nullOp(r.doc) ) ;
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
        objectPatient.getAllIdDoc()
        .then( doclist => {
            plist = doclist.rows;
            plist.forEach( p => nlist[p.id] = 0 );
            })
        .then( _ => objectOperation.getAllIdDoc() )
        .then( doclist =>
            doclist.rows.forEach( row => {
                row.doc["Date-List"] = objectOperation.dateFromDoc(row.doc) ;
                olist[row.doc.patient_id] = row.doc ;
                })
            )
        .then( _ => objectNote.getAllIdDoc() )
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
globalThis. CSV = CSV;

class Backup {
    static download( j, filename ) {
        DownloadFile.file( j, filename, 'application/json' ) ;
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
globalThis. Backup = Backup ;

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
        .then( _ => this.add_notes ? objectNote.getRecordsIdPix( missionId ) : Promise.resolve( ({ rows:[]}) ) )
        .then( notes => this.notelist( notes ) )
        // patient list
        .then( _ => objectPatient.getAllIdDocPix() )
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
                    .then( _ => this.add_ops ? objectOperation.getRecordsIdDoc( pt.id ) : Promise.resolve( ({ rows:[]}) ) )
                    .then( ops => this.oplist( ops ) )
                    // Get notes
                    .then( _ => this.add_notes ? objectNote.getRecordsIdPix( pt.id ) : Promise.resolve( ({ rows:[]}) ) )
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
            .sort((a,b)=>objectNote.dateFromDoc(a.doc).localeCompare(objectNote.dateFromDoc(b.doc)))
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
                .addNotes([doc?.text,doc._id,doc?.author,objectNote.dateFromDoc(doc).substring(0,10)].join("\n"))
                .addText(this.pname,{placeholder:"title",color:"e4e444",isTextBox:true,align:"center"})
                .addTable([[this.category(doc)],[objectNote.dateFromDoc(doc).substring(0,10)]],{x:6.6,y:.7,w:3.3,color:"e4e444",fontSize:28})
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
            .filter( r => ! objectOperation.nullOp(r.doc) )
            .sort((a,b)=>objectOperation.dateFromDoc(a.doc).localeCompare(objectOperation.dateFromDoc(b.doc)))
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
        .addNotes([doc?.Procedure,doc._id,doc?.author,objectOperation.dateFromDoc(doc).substring(0,10)].join("\n"))
        .addText(this.pname,{placeholder:"title",color:"e4e444",isTextBox:true,align:"center"})
        .addTable([["Operation"],[objectOperation.dateFromDoc(doc).substring(0,10)]],{x:6.6,y:.7,w:3.3,color:"e4e444",fontSize:28})
        .addTable(
            this.table(doc,["Procedure","Complaint","Surgeon","Equipment"]),
            {x:.5,y:1,w:6,fill:"114cc6",color:"ffffff",fontSize:24})
        ;
        return Promise.resolve(true);
    }
}   

class ZIP {
    constructor () {
        this.zip = new JSZip() ;

        this.check_img = document.getElementById("imgZIP");
        this.check_doc = document.getElementById("docZIP");
        this.qbtn = document.getElementById("createZIP");

        this.check_img.checked = true;
        this.check_doc.checked = true;
        this.test();
    }
    
    test() {
        this.qbtn.disabled = ! (this.check_img.checked || this.check_doc.checked) ;
    }
    
    image_name( name, doc ) {
        return [ name, doc._attachments.image.content_type.split("/")[1] ].join(".");
    }
    
    one_note_image( path, doc ) {
        if ( doc?._attachments?.image ) {
            this.zip.file( [path,this.image_name(Id.splitId(doc._id).key,doc)].join("/"), doc._attachments.image.data, {
                binary: true,
                createFolders: true,
                }) ;
        }
    }
    
    one_note_doc( path, doc ) {
        if ( doc?._attachments ) {
            Object.entries(doc._attachments)
            .filter( f => f[0] !== "image" )
            .forEach(f => this.zip.file( [path,f[0]].join("/"), f[1]["data"], {
                binary: true,
                createFolders: true,
                })) ;
        }
    }
    
    print() {
        const qimg = this.check_img.checked ;
        const qdoc = this.check_doc.checked ;
        
        Mission.getRecordId(true)
        .then( doc => {
            if ( qimg && doc?._attachments?.image ) {
                this.zip.file( this.image_name("Mission",doc), doc._attachments.image.data, {
                    binary: true,
                    createFolders: true,
                    }) ;
            }
            })
        .then(_=> objectNote.getRecordsIdPix(missionId,true))
        .then(notelist => notelist.rows
            .forEach( row => {
                if ( qimg ) {
                    this.one_note_image( "Mission", row.doc );
                }
                if ( qdoc ) {
                    this.one_note_doc( "Mission", row.doc );
                }
                })
            )
        .then( _ => objectPatient.getAllIdDocPix( true ) )
        .then( doclist => {
            this.numpats = doclist.rows.length ;
            this.pat = 0 ;
            // for each patient
            return PromiseSeq(
                doclist.rows.map( pt => {
                    return _ =>
                    db.query( "Pid2Name", {key:pt.id})
                    .then( q => {
                        this.pname = q.rows[0].value[0] ;
                        if ( qimg && pt.doc?._attachments?.image ) {
                            this.zip.file( this.image_name(this.pname,pt.doc), pt.doc._attachments.image.data, {
                                binary: true,
                                createFolders: true,
                                }) ;
                        }
                        })
                    .then( _ => objectNote.getRecordsIdPix( pt.id, true) )                    
                    .then( notelist => notelist.rows.forEach( row => {
                        if ( qimg ) {
                            this.one_note_image( this.pname, row.doc );
                        }
                        if ( qdoc ) {
                            this.one_note_doc( this.pname, row.doc );
                        }
                    }))
                    
                })
            )})
        .then( _ => this.zip.generateAsync({type:"blob"}) )
        .then( blob => DownloadFile.blob( blob, `${remoteCouch.database}.zip` ) )
        .catch( err => console.log(err) );
    }
}

class Page { // singleton class
    constructor() {
        // get page history from cookies
        // much simplified from app.js -- no checking of entries or history
        // since any unrecognized entries send us back to app.js
        this.path = displayState;
        this.lastscreen = null ; // splash/screen/patient for show_screen
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
        }
        objectCookie.set ( "displayState", this.path ) ;
    }

    test( page ) {
        return this.current()==page ;
    }

    link() {
        window.open( new URL(`/book/${this.current()}.html`,location.href).toString(), '_blank' );
    } 
    
    show( page = "AllPatients", extra="" ) { // main routine for displaying different "pages" by hiding different elements
        if ( db == null || credentialList.some( c=> remoteCouch[c]=='' ) ) {
            this.show("FirstTime");
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
            };
            for ( let cl in showscreen ) {
                document.querySelectorAll(cl)
                .forEach( (v)=> v.style.display=showscreen[cl]?"block":"none"
                );
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

class DownloadZIP extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block
    
    static subshow(extra="") {
        Mission.select();
        objectZIP = new ZIP() ;
    }
}

class ErrorLog extends Pagelist {
    static dummy_var=this.AddPage(); // add the Pagelist.pages -- class initiatialization block

    static subshow(extra="") {
        objectLog.show() ;
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
    
    // set state from URL or cookies
    URLparse() ; // setup remoteCouch and exclude command line parameters

    setButtons();
    
    // Start pouchdb database       
    if ( credentialList.every( c => remoteCouch[c] !== "" ) ) {
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
        if ( objectPatient.isSelected() ) { // mission too
            objectPatient.select() ;
        }

    } else {
        db = null;
        objectPage.reset();
        objectPage.show("FirstTime");
    }

};
