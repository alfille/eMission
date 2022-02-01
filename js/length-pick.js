var lp = {
  // (A) CREATE TIME PICKER
  instances : [], // All time picker instances
  init: function (wrapper, target) {
  // wrapper - container to generate time picker into
  // target - optional, target input field for inline time pickers

    // (A1) CREATE NEW INSTANCE + "GET ID"
    let id = lp.instances.length;
    lp.instances.push({ wrap : wrapper });
    let inst = lp.instances[id];
    if (target != undefined) { inst.target = target; }

    // (A2) TIME PICKER ITSELF
    let picker = document.createElement("div");
    picker.className = "tp";
    inst.wrap.appendChild(picker);

    // (A3) *THE* BUTTONATOR - HR + MIN + AM/PM
    let buttonator = function (segment) {
      // Button Container
      let box = document.createElement("div");
      box.className = "tp-box";

      // Up Button
      let up = document.createElement("div");
      up.innerHTML = "&#65087;";
      up.className = "tp-up";

      // Current Value
      let val = document.createElement("input");
      val.type = "text";
      val.disabled = true;
      val.className = "tp-val";
      if (segment == "hr") { val.value = "00"; }
      else { val.value = "00"; }
      inst[segment] = val;

      // Down Button
      let down = document.createElement("div");
      down.innerHTML = "&#65088;";
      down.className = "tp-up";

      // Button click handlers
      up.addEventListener("mousedown", function(){
        lp.spin(id, segment, 1);
      });
      down.addEventListener("mousedown", function(){
        lp.spin(id, segment, 0);
      });
      up.addEventListener("mouseup", lp.sspin);
      up.addEventListener("mouseleave", lp.sspin);
      down.addEventListener("mouseup", lp.sspin);
      down.addEventListener("mouseleave", lp.sspin);

      // Append all the buttons
      box.appendChild(up);
      box.appendChild(val);
      box.appendChild(down);
      picker.appendChild(box);
    };
    buttonator("hr");
    buttonator("min");
    
    // (A4) OK BUTTON
    let ok = document.createElement("input");
    ok.type = "button";
    ok.value = "OK";
    ok.className = "tp-ok";
    ok.addEventListener("click", function(){
      lp.set(id);
    });
    picker.appendChild(ok);
  },

  // (B) "HOLD TO SPIN" FOR HOUR + MIN
  stimer : null, // Spin timer
  ssensitive : 100, // lower will spin faster
  spin : function (id, segment, direction) {
    if (lp.stimer == null) {
      lp.sid = id;
      lp.sseg = segment;
      lp.smax = segment == "hr" ? 24 : 59;
      lp.smin = segment == "hr" ? 0 : 0;
      lp.sdir = direction;
      lp.hmspin();
      lp.stimer = setInterval(lp.hmspin, lp.ssensitive);
    }
  },

  // (C) STOP HR/MIN SPIN
  sspin : function () {
    if (lp.stimer != null) {
      clearInterval(lp.stimer);
      lp.stimer = null;
    }
  },

  // (D) SPIN HR OR MIN
  sid : null, // Instance ID
  sseg : null, // Segment to spin
  smax : null, // Maximum value (24 for hr, 59 for min)
  smin : null, // Minimum value (0 for hr, 0 for min)
  sdir : null, // Spin direction
  hmspin : function () {
    // (D1) CURRENT VALUE
    let box = lp.instances[lp.sid][lp.sseg],
        cv = parseInt(box.value);

    // (D2) SPIN!
    if (lp.sdir) { cv++; }
    else { cv--; }
    if (cv < lp.smin) { cv = lp.smin; }
    if (cv > lp.smax) { cv = lp.smax; }
    if (cv < 10) { cv = "0" + cv; }

    // (D3) UPDATE DISPLAY
    box.value = cv;
  },
  
  // (F) SET SELECTED TIME
  set : function (id) {
    // (F1) GET + FORMAT HH:MM AM/PM
    let inst = lp.instances[id],
    timestamp = lp.instances[id]["hr"].value + ":" +
                lp.instances[id]["min"].value + " " ;

    // (F2) SET TIMESTAMP
    inst.target.value = timestamp;

    // (F3) CLOSE TIME PICKER (POPUP ONLY)
    if (id==0) {
      inst.wrap.classList.remove("show");
    }
  },

  // (G) ATTACH TIME PICKER TO TARGET
  attach : function (opt) {
  // element - More direct than target
  // target - input field
  // wrap - optional, inline time picker

    // (G1) SET INPUT FIELD READONLY
    let target ;
    if ( "element" in opt ) {
        target = opt.element ;
    } else {
        target = document.getElementById(opt.target);
    }
    target.readOnly = true;
    
    // (G2) INLINE VERSION - GENERATE TIME PICKER HTML
    if (opt.wrap) {
      lp.init(document.getElementById(opt.wrap), target);
    }
    
    // (G3) POPUP VERSION - SHOW POPUP ON CLICK
    else {
      target.addEventListener("click", function(){
        // Get + set popup time
        let cv = this.value;
        if (( typeof cv !== "string" ) || ( cv.length < 5 ) ) {
          lp.instances[0].hr.value = "00";
          lp.instances[0].min.value = "00";
        } else {
          lp.instances[0].hr.value = cv.substring(0, 2);
          lp.instances[0].min.value = cv.substring(3, 5);
        }
        // Set target + show popup
        lp.instances[0].target = target;
        lp.instances[0].wrap.classList.add("show");
      });
    }
  }
};

// (H) CREATE "DEFAULT" POPUP TIME PICKER ON LOAD
window.addEventListener("DOMContentLoaded", function(){
  let pop = document.createElement("div");
  document.body.appendChild(pop);
  pop.id = "lp-pop";
  lp.init(pop);
});
