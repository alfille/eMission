/* eMission project
 * Medical mission database application
 * See https://github.com/alfille/eMission
 * or https://emissionsystem.org
 * by Paul H Alfille 2023
 * MIT license
 * */

// globals cookie backed
export class G {
	static objectPage ;
    static patientId;
    static noteId;
    static operationId;
    static displayState=[];
    static remoteCouch ={};

// other globals
	static credentialList = ["database", "username", "password", "address" ] ;

// Database handles and  
    static db ; // will be PouchG.db local copy 


// singleton class instances
    static objectPatientData;
    static objectNoteList={
		category: 'Uncategorized',
		};
    static objectTable = null;
    static objectRemote = null;
    static objectLog = null;
}
