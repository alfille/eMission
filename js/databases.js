// server-side script (run under node.js)
// to create and update the database collation
// databases

// Part of the eMission system
// Medical mission software for supporting humanitarian care
// See emissionsystem.org/book/index.html

// {c} 2023 Paul H Alfille MD

// Load modules

const args = process.argv;
const http_mode = "https"
let password = "";
let site="127.0.0.1";
let port = 5984;
const server = `${http_mode}://${site}:${port}`;


switch ( args.length ) {
    case 5:
        port = args[4];
        //fall through
    case 4:
        site = args[3];
        //fall through
    case 3:
        password = args[2];
        break ;
    default:
        console.log(`Create databases.\nUsage:\n\t${args[0]} ${args[1]} admin-password [site] [port]`);
        process.exit(1);
}

//console.log("password",password);
//console.log("site",site);
//console.log("port",port);

const nano = require('./nano.js')(`${http_mode}://admin:${password}@${site}:${port}`);

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
        server: server,
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
            ["server", "Organization","Name","Location","StartDate","EndDate","Mission","Link"]
            .forEach( f => {
                if ( docs[f] != doc[f] ) {
                    changed = true ;
                    docs[f] = doc[f] ;
                }
                });
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
