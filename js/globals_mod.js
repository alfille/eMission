/* eMission project
 * Medical mission database application
 * See https://github.com/alfille/eMission
 * or https://emissionsystem.org
 * by Paul H Alfille 2023
 * MIT license
 * */

// globals cookie backed
var objectPage ;
var patientId;
var noteId;
var operationId;
var displayState;
var remoteCouch;

// other globals
var in_frame = false ;
var frame_name = "" ;
var NoPhoto = "style/NoPhoto.png";
var DCTOHClogo = "images/DCTOHC11.jpg";

const credentialList = ["database", "username", "password", "address" ] ;

// Database handles and  
var db ; // will be Pouchdb local copy 


// singleton class instances
var objectPatientData;
var objectNoteList={};
    objectNoteList.category = 'Uncategorized' ;
var objectTable = null;
var objectSearch = null;
var objectRemote = null;
var objectCollation = null;
var objectLog = null;

