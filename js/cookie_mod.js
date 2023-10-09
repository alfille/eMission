/* eMission project
 * Medical mission database application
 * See https://github.com/alfille/eMission
 * or https://emissionsystem.org
 * by Paul H Alfille 2023
 * MIT license
 * */
 
export {
    Cookie,
} ;

class Cookie { //convenience class
    set( cname, value ) {
        // From https://www.tabnine.com/academy/javascript/how-to-set-cookies-javascript/
        if ( ! in_frame ) {
            // Don't store values for in-frame instances -- it gets too confusing
            globalThis[cname] = value;
            let date = new Date();
            date.setTime(date.getTime() + (400 * 24 * 60 * 60 * 1000)); // > 1year
            document.cookie = `${cname}=${encodeURIComponent(JSON.stringify(value))}; expires=${date.toUTCString()}; SameSite=None; Secure; path=/`;
        }
    }

    del( cname ) {
        globalThis[cname] = null;
        document.cookie = cname +  "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    }

    get( cname ) {
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
        globalThis[cname] = ret;
        return ret;
    }

    initialGet() {
        [ "patientId", "noteId", "operationId", "remoteCouch", "displayState" ].forEach( c => this.get(c) );
    }

    clear() {
        [ "patientId", "noteId", "operationId", "remoteCouch", "displayState" ].forEach( c => this.del(c) );
    }
}
objectCookie = new Cookie() ;
