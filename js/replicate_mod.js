/* eMission project
 * Medical mission database application
 * See https://github.com/alfille/eMission
 * or https://emissionsystem.org
 * by Paul H Alfille 2023
 * MIT license
 * */

export {
    RemoteReplicant,
    } ;

import {
    } from "./globals_mod.js" ;

class RemoteReplicant { // convenience class
    // Access to remote (cloud) version of database
    constructor() {
        this.remoteDB = null;
        this.problem = false ; // separates real connection problem from just network offline
        this.synctext = document.getElementById("syncstatus");
    }
    
    start( qline={} ) {        
        // Get remote DB from cookies if available
        if ( remoteCouch == null ) {
            remoteCouch = {} ;
            credentialList.forEach( c => remoteCouch[c] = "" );
        }

        // Get Remote DB fron command line if available
        if ( credentialList.every( k => k in qline ) ) {
            let updateCouch = false ;
            credentialList
            .filter( f => f in qline )
            .filter( f => remoteCouch[f] != qline[f] )
            .forEach( f => {
                updateCouch = true ;
                remoteCouch[f] = qline[f] ;
                });
            // Changed, so reset page
            if ( updateCouch ) {
                objectPage.reset() ;               
                objectCookie.set( "remoteCouch", remoteCouch );
            }
        }
        

        // set up monitoring
        window.addEventListener("offline", _ => this.not_present() );
        window.addEventListener("online", _ => this.present() );

        // initial status
        navigator.onLine ? this.present() : this.not_present() ;
    }
    
    present() {
        this.status( "good", "--network present--" ) ;
    }

    not_present() {
        this.status( "disconnect", "--network offline--" ) ;
    }

    // Initialise a sync process with the remote server
    foreverSync() {
        this.remoteDB = this.openRemoteDB( remoteCouch ); // null initially
        document.getElementById( "userstatus" ).value = remoteCouch.username;
        if ( this.remoteDB ) {
            this.status( "good","download remote database");
            db.replicate.from( this.remoteDB )
                .catch( (err) => this.status("problem",`Replication from remote error ${err.message}`) )
                .finally( _ => this.syncer() );
        } else {
            this.status("problem","No remote database specified!");
        }
    }
    
    syncer() {
        this.status("good","Starting database intermittent sync");
        db.sync( this.remoteDB ,
            {
                live: true,
                retry: true,
                filter: (doc) => doc._id.indexOf('_design') !== 0,
            } )
            .on('change', ()       => this.status( "good", "changed" ))
            .on('paused', ()       => this.status( "good", "quiescent" ))
            .on('active', ()       => this.status( "good", "actively syncing" ))
            .on('denied', ()       => this.status( "problem", "Credentials or database incorrect" ))
            .on('complete', ()     => this.status( "good", "sync stopped" ))
            .on('error', (err)     => this.status( "problem", `Sync problem: ${err.reason}` ));
    }
    
    status( state, msg ) {
        switch (state) {
            case "disconnect":
                document.body.style.background="#7071d3"; // Orange
                if ( this.lastState !== state ) {
                    objectLog.err(msg,"Network status");
                }
                break ;
            case "problem":
                document.body.style.background="#d72e18"; // grey
                objectLog.err(msg,"Network status");
                this.problem = true ;
                break ;
            case "good":
            default:
                document.body.style.background="#172bae"; // heppy blue
                if ( this.lastState !== state ) {
                    objectLog.err(msg,"Network status");
                }
                this.problem = false ;
                break ;
        }
        this.synctext.value = msg ;
    }
            
    openRemoteDB( DBstruct ) {
        if ( DBstruct && credentialList.every( k => k in DBstruct )  ) {
            return new PouchDB( [DBstruct.address, DBstruct.database].join("/") , {
                "skip_setup": "true",
                "auth": {
                    "username": DBstruct.username,
                    "password": DBstruct.password,
                    },
                });
        } else {
            objectLog.err("Bad DB specification");
            return null;
        }
    }
            
    closeRemoteDB() {
        return Promise.all( [
            objectUser.user_db ? objectUser.user_db.close() : Promise.resolve(true),
            security_db ? security_db.close() : Promise.resolve(true),
            ]);
    }

    SecureURLparse( url ) {
        let prot = "https";
        let addr = url;
        let port = "6984";
        let spl = url.split("://") ;
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

    // Fauxton link
    link() {
        window.open( `${remoteCouch.address}/_utils`, '_blank' );
    }
}
objectRemote = new RemoteReplicant() ;
