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

// defaults
let config = {
    remote: "https://emissionsystem.org:6984",
    local: "http://127.0.0.1:15984",
    username: "admin",
    password: "",
}
    
let config_file = "/etc/eMission.json";

switch ( args.length ) {
    case 3:
        config_file = args[2] ;
        if (config_file.toLowerCase() == "help" || config_file=="?" ) {
            help() ;
        }
        break ;
    case 2:
        console.log(`Using default config file: ${config_file}`);
        break ;
    default:
        help();
}

try {
    const c = require(config_file) ;
    //console.log(config,c);
    Object.assign( config, c);
    //console.log(config,c);
} catch (err) {
    console.log(`Trouble with JSON config file: ${config_file}`,err);
    help();
}

const remote_url = new URL(config.remote);
const local_url = new URL(config.local);
local_url.username = config.username;
local_url.password = config.password;

//console.log("local",local_url.href);
//console.log("remote",remote_url.href);

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

let dbs_handle = null ;

function create_dbs() {
    DB.create("databases")
    .catch( err => {
        console.log(`Cannot create "databases"`.err); 
        process.exit(1);
    });
}

function d_list() {
    // create a list of database files
    // and create "databases"
    return DB.list()
    .then(db => db
        .filter( d => d.slice(0,1) != '_' )
        .map( d => "0"+d )
        .forEach( d => summary.files.add(d) )
        )
    .then( _ => {
        let exist = summary.files.has("0databases");
        summary.files.delete("0databases");
        if ( ! exist ) {
            return create_dbs() ;
        } else {
            return Promise.resolve(true);
        }
        })
    .catch( err => {
        console.log("cannot get file list",err);
        process.exit(1);
        })
    ;
}

d_list()
//.then(_=> console.log("Starting",summary))
.then(_=> dbs_handle = DB.use("databases") )
.then(_=> dbs_handle.list() )
.then(doclist=>doclist.rows.forEach(d=>summary.database.add(d.id)))
.then(_=> console.log("Files and old data",summary))
.then(_=> cull_the_dead())
.then(_=> update_entries() )
.then(_=> console.log("Final state",summary)) 
;

function new_dbs_record( db_id, doc) {
    // add a database record to databases 
    return dbs_handle.insert( {
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
    .then( _=> summary.added.add(db_id) )
    .catch( err =>console.log(`cannot add record for database ${db_id}`,err) ) ;
}

function empty_dbs_record( db_id ) {
    return {
        _id: db_id,
        db_name: db_id.slice(1),
        server: remote_url.href,
        Organization:"Unknown",
        Name:db_id.slice(1),
        Location:"Unknown",
        StartDate:"",
        EndDate:"",
        Mission:db_id.slice(1),
        Link:"",
    };
}

function cull_the_dead() {
    //console.log("Pre Cull",summary);
    [...summary.database].filter(f => ! summary.files.has(f)).forEach(f=>summary.deleted.add(f));
    return Promise.all(
        [...summary.database]
        .filter(f => ! summary.files.has(f))
        .map(f=>dbs_handle
            .get(f)
            .then(d=>dbs_handle.destroy(d._id,d._rev))
            )
        );
}

function update_entries() {
    //console.log("Pre Update",summary);
    return Promise.all(
    [...summary.files].map( f => process_database( f ))
    );
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
                return dbs_handle.insert(docs) ;
            } else {
                summary.unchanged.add(db_id);
                return Promise.resolve(true);
            }
            })
        .catch( err => console.log(`cannot open databases record for ${db_id}`,err ) );
    } else {
        summary.added.add(db_id);
        return new_dbs_record( db_id, doc ) ;
    }
}

function process_database( db_id ) {
    return DB
    .use(db_id.slice(1))
    .get( "m;0;;;")
    .then( doc => check_dbs_record( db_id, doc ) )
    .catch( err=> check_dbs_record( db_id, empty_dbs_record(db_id)));
}

function help() {
    console.log(
        `
Create databases.
    Part of eMission medical mission support system
    {c} Paul H Alfille 2013
    https://emissionsystem.org/book/index.html

Usage:
    node database.js [config-file]
  e.g:  
    node database.js /etc/eMission.json
    
JSON file format (must be .json file extension):
{
  "password": "your secret",
  "remote": "https://emissionsystem.org:6984",
  "local": "http://127.0.0.1:15984",
  "username": "admin"
}
  
`);
    process.exit(1);
}
