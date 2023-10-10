/* eMission project
 * Medical mission database application
 * See https://github.com/alfille/eMission
 * or https://emissionsystem.org
 * by Paul H Alfille 2023
 * MIT license
 * */
 
export {
    Log,
} ;

import {
    } from "./globals_mod.js" ;

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
