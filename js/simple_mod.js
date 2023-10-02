/* eMission project
 * Medical mission database application
 * See https://github.com/alfille/eMission
 * or https://emissionsystem.org
 * by Paul H Alfille 2023
 * MIT license
 * */
 
export {
    SimplePatient,
    SimpleNote,
    SimpleOperation,
    } ;
    
import {
    TitleBox,
    } from "./globals_mod.js" ;

import {
    Id,
    Id_patient,
    Id_mission,
    Id_note,
    Id_operation,
    } from "./id_mod.js" ;

class SimplePatient { // convenience class
    getRecordId(id=patientId ) {
        return db.get( id );
    }

    getRecordIdPix(id=patientId, binary=false ) {
        return db.get( id, { attachments:true, binary:binary } );
    }

    getAllId() {
        let doc = {
            startkey: Id_patient.allStart(),
            endkey:   Id_patient.allEnd(),
        };

        return db.allDocs(doc);
    }
        
    getAllIdDoc(binary=false) {
        let doc = {
            startkey: Id_patient.allStart(),
            endkey:   Id_patient.allEnd(),
            include_docs: true,
            attachments: true,
            binary: binary,
        };

        return db.allDocs(doc);
    }
        
    getAllIdDocPix(binary=false) {
        // Note: using base64 here
        let doc = {
            startkey: Id_patient.allStart(),
            endkey:   Id_patient.allEnd(),
            include_docs: true,
            binary: binary,
            attachments: true,
        };

        return db.allDocs(doc);
    }

    select( pid = patientId ) {
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

    isSelected() {
        return ( patientId != null ) && ( patientId != missionId ) ;
    }
}

class SimpleNote { // convenience class
    getAllIdDoc() {
        let doc = {
            startkey: Id_note.allStart(),
            endkey:   Id_note.allEnd(),
            include_docs: true,
            binary: false,
            attachments: false,
        };
        return db.allDocs(doc);
    }

    getRecordsId(pid=patientId) {
        let doc = {
            startkey: Id_note.patStart(pid),
            endkey: Id_note.patEnd(pid),
        };
        return db.allDocs(doc) ;
    }

    getRecordsIdDoc(pid=patientId) {
        let doc = {
            startkey: Id_note.patStart(pid),
            endkey: Id_note.patEnd(pid),
            include_docs: true,
        };
        return db.allDocs(doc) ;
    }

    getRecordsIdPix( pid = patientId, binary=false) {
        // Base64 encoding by default (controled by "binary")
        let doc = {
            startkey: Id_note.patStart(pid),
            endkey: Id_note.patEnd(pid),
            include_docs: true,
            binary: binary,
            attachments: true,
        };
        return db.allDocs(doc) ;
    }

    dateFromDoc( doc ) {
        return ((doc["date"] ?? "") + Id_note.splitId(doc._id).key).substring(0,24) ;
    }
}


class SimpleOperation { // convenience class
    create() {
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
    
    getRecordsIdDoc( pid=patientId ) {
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
                .filter( (row) => ( row.doc.Status === "none" ) && this.nullOp( row.doc ) )
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
                .then( ()=> this.getRecordsIdDoc( pid )
                );
            })
        .catch( () => {
            return this.create().then( () => db.allDocs(doc) );
            });
    }

    getAllIdDoc() {
        let doc = {
            startkey: Id_operation.allStart(),
            endkey:   Id_operation.allEnd(),
            include_docs: true,
        };
        return db.allDocs(doc);
    }

    getRecordsId(pid=patientId) {
        let doc = {
            startkey: Id_operation.patStart(pid),
            endkey: Id_operation.patEnd(pid),
            include_docs: true,
        };
        return db.allDocs(doc) ;
    }

    dateFromDoc( doc ) {
        return ((doc["Date-Time"] ?? "") + Id_operation.splitId(doc._id).key).substring(0,24) ;
    }
    
    nullOp( doc ) {
        return doc.Procedure == "Enter new procedure" ;
    }
}
