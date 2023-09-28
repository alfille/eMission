/* eMission project
 * Medical mission database application
 * See https://github.com/alfille/eMission
 * or https://emissionsystem.org
 * by Paul H Alfille 2023
 * MIT license
 * */

// globals cookie backed
globalThis.patientId = null ;
globalThis.noteId = null ;
globalThis.operationId = null ;
globalThis.displayState = null ;
globalThis.remoteCouch = null ;

// other globals
globalThis.credentialList = ["database", "username", "password", "address" ] ;

// singleton class instances
globalThis.objectPage = null ;
globalThis.objectPatientData = null ;
globalThis.objectNoteList = {
	category: 'Uncategorized',
	};
globalThis.objectTable = null ;
globalThis.objectRemote = null ;
globalThis.objectLog = null ;

// Database handles
globalThis.db = null ; // will be Pouchdb local copy 
