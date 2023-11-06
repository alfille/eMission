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

console.log("password",password);
console.log("site",site);
console.log("port",port);

const nano = require('./nano.js')(`${http_mode}://admin:${password}@${site}:${port}`);

let DB = nano.db ;

function databases_create() {
    DB.create("databases")
    .catch( err => {
        console.log(`Cannot create "databases"`); 
        console.log(err);
        process.exit(1);
    });
}

let database_list = [] ;
let dbs_handle = null ;
function d_list() {
    return DB.list()
        .then(db => database_list = db )
        .catch( err => {
            console.log("cannot get list");
            console.log(err);
            process.exit(1);
            })
        .finally( _ => {
            if ( database_list.indexOf("databases") == -1 ) {
                return databases_create() ;
            }
            database_list = database_list 
            .filter( d => d != "databases" ) 
            .filter( d => d.slice(0,1) != '_' ) 
            ;
            return Promise.resolve(true);
            });
}
const summary = {
    database:  new Set(),
    files:     new Set(),
    unchanged: new Set(),
    updated:   new Set(),
    added:     new Set(),
    deleted:   new Set(),
};

d_list()
.then( _ => {
    console.log("DB",database_list);
    dbs_handle - DB.use("databases");
    try {
        dbs_handle.list()
        .then(doclist=>doclist.rows.forEach(d=>summary.database.add(d.id)));
    } catch ({name,message}) {
        console.log(`${name}: ${message}`);
    } finally {
        console.log("post try/catch");
    }
//    console.log("databases handle",dbs_handle);
//    dbs_handle.info().then(i => console.log("info2",i));
//    dbs_handle.list().then( doclist => doclist.rows.forEach( d => console.log(d)));
    database_list.forEach( d => get_mission( d ) )
    }) ;

function new_databases( db_id, doc) {
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
    .catch( err =>{
        console.log(`cannot add record for database ${db.id}`);
        console.log(err);
        });
}

function check_databases( db_id, doc ) {
    const changed = false ;
    if ( summary.database.has(db_id.split(1)) ) {
        dbs_handle.get( db_id )
        .then( docs => 
            ["server", "Organization","Name","Location","StartDate","EndDate","Mission","Link"]
            .forEach( f => {
                if ( doc[f] != docs[f] ) {
                    changed = true ;
                    docs[f] = doc[f] ;
                }
                })
            )
        .catch( err => console.log(`cannot open databases record for ${db_id}` ) )
        .finally( _ => {
            if ( changed ) {
                dbs_handle.insert(docs)
                .catch(err => {
                    console.log(`cannot update databases file for ${db_id}`);
                    console.log(err);
                    });
            }
            });
    } else {
        return new_databases( db_id, doc ) ;
    }
}

function get_mission( db ) {
    const db_handle = DB.use(db) ;
    const db_id = "0"+db;
    db_handle.get( "m;0;;;")
    .then( doc => check_databases( db_id, doc ) )
    .catch( err=> {
        console.log(`get mission error database ${db}`);
        console.log(err);
        });
}
    
    


