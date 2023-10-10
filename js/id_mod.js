/* eMission project
 * Medical mission database application
 * See https://github.com/alfille/eMission
 * or https://emissionsystem.org
 * by Paul H Alfille 2023
 * MIT license
 * */
 
export {
    Id,
    Id_patient,
    Id_mission,
    Id_note,
    Id_operation,
} ;

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
globalThis. missionId = Id_mission.makeId() ;
