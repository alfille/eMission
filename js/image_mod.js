/* eMission project
 * Medical mission database application
 * See https://github.com/alfille/eMission
 * or https://emissionsystem.org
 * by Paul H Alfille 2023
 * MIT license
 * */
 
export {
    ImageDrop,
    ImageImbedded,
    ImageNote,
    ImageQuick,
} ;

class ImageImbedded {
    static srcList = [] ;
    
    constructor( parent, doc, backupImage ) {
        this.doc = doc;
        this.parent = parent;
        this.backupImage = backupImage ;

        const att = this.doc ?._attachments ;

        // image
        const data = att ?.image ?.data;
        if ( data === undefined ) {
            this.src = this.backupImage ?? null ;
        } else {
            this.src = URL.createObjectURL(data);
            this.addSrc(this.src);
        }
        this.upload_image=null;

        // file
        let fl = Object.entries(att??{}).filter( e => e[0] !== "image" ) ;
        if ( fl.length > 0 ) {
            this.filename = fl[0][0];
            this.file = URL.createObjectURL(fl[0][1]["data"]);
            this.addSrc(this.file);
        } else {
            this.filename = "";
            this.file = null;
        }
        this.upload_file=null;
    }
    
    addSrc(src) {
        ImageImbedded.srcList.push( src ) ;
    }

    static clearSrc() {
        ImageImbedded.srcList.forEach( s => URL.revokeObjectURL( s ) );
        ImageImbedded.srcList = [] ;
    }

    source() {
        return this.src;
    }

    static showBigPicture( target ) {
        let big = document.querySelector( ".FloatPicture" );
        big.src = target.src;
        big.style.display = "block";
    }
    
    static hideBigPicture( target ) {
        target.src = "";
        target.style.display = "none";
    }

    display_image() {
        const img = this.parent.querySelector( "img");
        const fl = this.parent.querySelector( ".entryfield_file")
        if ( img ) {
            img.addEventListener( 'click', () => ImageImbedded.showBigPicture(img) );
            if ( this.src ) {
                img.src = this.src;
                img.style.display = "block";
            } else {
                img.src = "//:0";
                img.style.display = "none" ;
            }
        }
        if ( fl ) {
            if ( this.file ) {
                fl.style.display="block";
                fl.querySelector("label").innerText=this.filename;
                fl.querySelector("a").download=this.filename;
                fl.querySelector("a").href=this.file;
            } else {
                fl.style.display="none";
            }
        }
    }
        
    addListen() {
        try { this.parent.querySelector( ".imageGet").addEventListener( 'click', () => this.getImage() ); }
            catch { // empty 
                }
        try { this.parent.querySelector( ".imageRemove").addEventListener( 'click', () => this.removeImage() ); }
            catch { // empty 
                }
        try { this.parent.querySelector( ".fileGet").addEventListener( 'click', () => this.getFile() ); }
            catch { // empty 
                }
        try { this.parent.querySelector( ".fileRemove").addEventListener( 'click', () => this.removeFile() ); }
            catch { // empty 
                }
        try { this.parent.querySelector( ".imageBar").addEventListener( 'change', () => this.handleImage() ); }
            catch { // empty 
                }
        try { this.parent.querySelector( ".fileBar").addEventListener( 'change', () => this.handleFile() ); }
            catch { // empty 
                }
    }

    removeImage() {
        this.upload_image="remove";
        this.src=this.backupImage ?? null ;
        this.display_image();
    }

    removeFile() {
        this.upload_file="remove";
        this.file=null ;
        this.display_image();
    }

    getImage() {
        const inp = this.parent.querySelector(".imageBar");
        if ( isAndroid() ) {
            inp.removeAttribute("capture");
        } else {
            inp.setAttribute("capture","environment");
        }
        inp.click();
    }

    getFile() {
        const inp = this.parent.querySelector(".fileBar");
        if ( isAndroid() ) {
            inp.removeAttribute("capture");
        } else {
            inp.setAttribute("capture","environment");
        }
        inp.click();
    }

    handleImage() {
        const files = this.parent.querySelector('.imageBar') ;
        this.upload_image = files.files[0];
        this.src = URL.createObjectURL(this.upload_image);
        this.addSrc(this.src);
        this.display_image();
        try { this.parent.querySelector(".imageRemove").disabled = false; }
            catch{ // empty
                }
    }

    handleFile() {
        const files = this.parent.querySelector('.fileBar') ;
        this.upload_file = files.files[0];
        this.file = URL.createObjectURL(this.upload_file);
        this.filename=files.files[0].name;
        this.addSrc(this.file);
        this.display_image();
        try { this.parent.querySelector(".fileRemove").disabled = false; }
            catch{ // empty
                }
    }

    save(doc) {
        const att = [] ;
        if ( this.upload_image == null ) { // no change
            if ( doc ?. _attachments ?. image ) {
                att.push( {image: doc._attachments.image} );
            }
        } else if ( this.upload_image !== "remove" ) {
            att.push({ image: {
                        content_type: this.upload_image.type,
                        data: this.upload_image,
                        }
                    });
        }
        if ( this.upload_file == null ) { // no change
            if ( this.filename != "" ) {
                att.push( {[this.filename]: doc ?. _attachments[this.filename] } ) ;
            }
        } else if ( this.upload_file !== "remove" ) {
            att.push({ [this.filename]: {
                        content_type: this.upload_file.type,
                        data: this.upload_file,
                        }
                    });
        }
        console.log(att);
        delete doc._attachments ;
        if ( att.length > 0 ) {
            doc._attachments = {} ;
            att.forEach( a => Object.assign( doc._attachments, a ) );
        }
        console.log(doc);
    }

    changed() {
        return this.upload_image != null;
    }
}
globalThis. ImageImbedded = ImageImbedded ;

class ImageNote extends ImageImbedded {
    constructor( ...args ) {
        super( ...args );
        this.text = this.doc?.text ?? "";
        this.title = this.doc?.title ?? "";
        this.category = this.doc?.category ?? "";
        this.buttonsdisabled( false );
    }
    
    leave() {
        this.buttonsdisabled( false );
        if (patientId == missionId) {
            objectPage.show( 'MissionList');
        } else if ( objectNoteList.category == 'Uncategorized' ) {
            objectPage.show( 'NoteList');
        } else {
            objectPage.show( 'NoteListCategory', objectNoteList.category);
        }
    }

    display_all() {
        this.parent.querySelector(".entryfield_text").innerText = this.text;
        this.parent.querySelector(".entryfield_title").innerText = this.title;
        this.parent.querySelector("select").value = this.category;
        this.display_image();
    }

    store() {
        this.save( this.doc );
        db.put( this.doc )
        .then( resp => {
            objectNote.select( resp.id );
            return objectNote.getAllIdDoc(); // to prime list
            })
        .catch( err => objectLog.err(err) )
        .finally( () => this.leave() );
    }

    edit() {
        this.addListen();
        this.buttonsdisabled( true );
        this.display_all();
    }

    addListen() {
        super.addListen();
        try { this.parent.querySelector( ".imageSave").addEventListener( 'click', () => this.store() ); }
            catch { //empty
                }
        try { this.parent.querySelector( ".imageCancel").addEventListener( 'click', () => this.leave() ); }
            catch { //empty
                }
        try { this.parent.querySelector( ".imageDelete").addEventListener( 'click', () => this.delete() ); }
            catch { //empty
                }
    }

    buttonsdisabled( bool ) {
        document.querySelectorAll(".libutton" ).forEach( b => b.disabled=bool );
        document.querySelectorAll(".divbutton").forEach( b => b.disabled=bool );
    }

    save(doc) {
        super.save(doc);
        doc.text = this.parent.querySelector(".entryfield_text").innerText;
        doc.title = this.parent.querySelector(".entryfield_title").innerText;
        doc.category = this.parent.querySelector("select").value;
    }

    delete() {
        let pdoc;
        Patient.getRecordId()
        .then( (doc) => {
            pdoc = doc;
            return db.get( noteId );
            })
        .then( (doc) => {
            if ( confirm(`Delete note on patient ${pdoc.FirstName} ${pdoc.LastName} DOB: ${pdoc.DOB}.\n -- Are you sure?`) ) {
                return doc;
            } else {
                throw "No delete";
            }           
            })
        .then( (doc) => db.remove(doc) )
        .then( () => objectNote.unselect() )
        .catch( (err) => objectLog.err(err) )
        .finally( () => this.leave() );
    }
}

class ImageQuick extends ImageImbedded {
    addListen(hfunc) {
        try { this.parent.querySelector( ".imageGet").addEventListener( 'click', () => objectPage.show('QuickPhoto') ); }
            catch { //empty
                }
        try { this.parent.querySelector( ".imageBar").addEventListener( 'change', () => hfunc() ); }
            catch { //empty
                }
    }
}

class ImageDrop extends ImageImbedded { // can only save(doc)
    constructor( upload_image ) {
        super( null, null );
        this.upload_image = upload_image;
    }
}

function isAndroid() {
    return navigator.userAgent.toLowerCase().indexOf("android") > -1;
}
