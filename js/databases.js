// server-side script (run under node.js)
// to create and update the database collation
// databases

// Part of the eMission system
// Medical mission software for supporting humanitarian care
// See emissionsystem.org/book/index.html

// {c} 2023 Paul H Alfille MD

// Load modules

const args = process.argv;
require("url");
let remote_url = new URL("http://127.0.0.1:15984");
let local_url = new URL("https://emissionsystem.org:6984");


switch ( args.length ) {
    case 5:
        remote_url = new URL(args[4]);
        //fall through
    case 4:
        local_url = new URL(args[3]);
        //fall through
    case 3:
        local_url.username="admin";
        local_url.password = args[2];
        break ;
    default:
        console.log(
        `
Create databases.
    Part of eMission medical mission support system
    {c} Paul H Alfille 2013
    https://emissionsystem.org/book/index.html

Usage:
    node database.js admin-password [local_url] [remote_url]
  e.g:  
    node database.js pssw0rd http://127.0.0.1:5984 https:/emissionsystem.org:6984
`);
        process.exit(1);
}

console.log("local",local_url.href);
console.log("remote",remote_url.href);

const nano = require('./nano.js')(local_url.href);

let DB = nano.db ;

const summary = {
    database:  new Set(),
    files:     new Set(),
    unchanged: new Set(),
    updated:   new Set(),
    added:     new Set(),
    deleted:   new Set(),
};

function create_dbs() {
    DB.create("databases")
    .catch( err => {
        console.log(`Cannot create "databases"`.err); 
        process.exit(1);
    });
}

let dbs_handle = null ;

function d_list() {
    // create a list of database files
    // and create "databases"
    return DB.list()
    .then(db => db
        .filter( d => d.slice(0,1) != '_' )
        .map( d => "0"+d )
        .forEach( d => summary.files.add(d) )
        )
    .catch( err => {
        console.log("cannot get file list",err);
        process.exit(1);
        })
    .finally( _ => {
        let exist = summary.files.has("0databases");
        summary.files.delete("0databases");
        if ( ! exist ) {
            return create_dbs() ;
        } else {
            return Promise.resolve(true);
        }
        });
}

d_list()
.then( _ => {
    console.log("Starting",summary);
    dbs_handle = DB.use("databases");
    dbs_handle.list()
    .then(doclist=>doclist.rows.forEach(d=>summary.database.add(d.id)))
    .finally( _ => console.log("+ Database",summary));
    // files -> databases
    summary.files.forEach( d => get_db_mission( d ) )
    // databases -files
    summary.database.forEach( d => {
        if ( ! summary.files.has(d) ) {
            summary.deleted.add(d);
            dbs_handle.get(d)
            .then( doc => dbs_handle.destroy( d, doc.rev ) )
            .catch( err => console.log(`could not remove record ${d}`,err) );
        }
        }) ;
    })
.finally( _=> console.log("Finishing",summary)) ;

function new_dbs_record( db_id, doc) {
    // add a database record to databases 
    dbs_handle.insert( {
        _id: db_id,
        db_name: db_id.slice(1),
        server: remote_url.href,
        Organization: doc?.Organization,
        Name: doc?.Name,
        Location:doc?.Location,
        StartDate:doc?.StartDate,
        EndDate:doc?.EndDate,
        Mission:doc?.Mission,
        Link:doc?.Link,
        })
    .catch( err =>console.log(`cannot add record for database ${db_id}`,err) ) ;
}

function check_dbs_record( db_id, doc ) {
    // see if a database is changed, not yet present, or unchanged
    if ( summary.database.has(db_id) ) {
        dbs_handle.get( db_id )
        .then( docs => {
            let changed = false ;
            ["Organization","Name","Location","StartDate","EndDate","Mission","Link"]
            .forEach( f => {
                if ( docs[f] != doc[f] ) {
                    changed = true ;
                    docs[f] = doc[f] ;
                }
                });
            if ( docs?.server != remote_url.href ) {
                docs.server = remote_url.href ;
                changed = true ;
            }
            if ( changed ) {
                summary.updated.add(db_id);
                dbs_handle.insert(docs)
                .catch(err => {
                    console.log(`cannot update databases file for ${db_id}`,err);
                    });
            } else {
                summary.unchanged.add(db_id);
            }
            })
        .catch( err => console.log(`cannot open databases record for ${db_id}`,err ) );
    } else {
        summary.added.add(db_id);
        return new_dbs_record( db_id, doc ) ;
    }
}

function get_db_mission( db_id ) {
    const db_handle = DB.use(db_id.slice(1)) ;
    db_handle.get( "m;0;;;")
    .then( doc => check_dbs_record( db_id, doc ) )
    .catch( err=> {
        console.log(`get mission error database ${db_id}`,err);
        });
}
