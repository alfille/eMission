/* eMission project
 * Medical mission database application
 * See https://github.com/alfille/eMission
 * or https://emissionsystem.org
 * by Paul H Alfille 2023
 * MIT license
 * */

// globals cookie backed
globalThis. patientId = null ;
globalThis. noteId = null ;
globalThis. operationId = null ;
globalThis. displayState = null ;
globalThis. remoteCouch = null ;

// other globals
globalThis. credentialList = ["database", "username", "password", "address" ] ;
globalThis. in_frame = false ;
globalThis. frame_name = "" ;

// singleton class instances
globalThis. objectPage = null ;
globalThis. objectPatientData = null ;
globalThis. objectNoteList = {
	category: 'Uncategorized',
	};
globalThis. objectTable = null ;
globalThis. objectRemote = null ;
globalThis. objectLog = null ;

// Database handles
globalThis.db = null ; // will be Pouchdb local copy 

// app only
globalThis. objectSearch = null;
globalThis. objectCollation = null;

// admin only
globalThis. security_db = null ;
globalThis. objectSecurity = null;

// download only
// singleton class instances
globalThis. objectPPTX = null;
globalThis. objectZIP = null;

// Commonly used function
export function cloneClass( fromClass, target ) {
    let c = document.getElementById("templates").querySelector(fromClass);
    target.innerHTML = "";
    c.childNodes.forEach( cc => target.appendChild(cc.cloneNode(true) ) );
}    

