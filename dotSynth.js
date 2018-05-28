$(document).ready(function() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext);
    masterGain = audioCtx.createGain();
    masterComp = audioCtx.createDynamicsCompressor();
    masterGain.connect(masterComp);
    masterComp.connect(audioCtx.destination);
    init();
    $("#newDot").click(function() {
        audioCtx.resume();
        note = new Note();
        note.x = canvas.width / 2;
        note.y = canvas.height / 2;
        notes[numNotes] = note;
        createOsc(numNotes);
        numNotes++;
        draw();
    });
    $("#soundToggle").click(function() {
        audioCtx.resume();
        if ($(this).hasClass("active")) {
            masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
            $(this).removeClass("active");
            soundOn = false;
        }
        else {
            masterGain.gain.linearRampToValueAtTime(0.9, audioCtx.currentTime + 0.01);
            $(this).addClass("active");
            soundOn = true;
        }
    });
    $("#chromaticToggle").click(function() {
        if ($(this).hasClass("active")) {
            chromatic = false;
            $(this).removeClass("active");
        }
        else {
            chromatic = true;
            $(this).addClass("active");
        }
    });
    $("#deleteAll").click(function() {
        while (numNotes > 0) {
            deleteNote(0);
        }
    });
});

var numNotes = 0;
var notes = [];
var oscs = [];
var gains = [];
var soundOn = true;
var chromatic = false;
var selectedNote = -1;
var selectedNotes = new Set([]);

function midiToFreq(midiNote) {
    midiNote = Math.floor(midiNote);
    return 27.5 * Math.pow(2, ((midiNote - 21) / 12));
}

function logScale(position, minp_, maxp_, minv_, maxv_) {
    var minp = minp_;
    var maxp = maxp_;
    var minv = Math.log(minv_);
    var maxv = Math.log(maxv_);

    var scale = (maxv-minv) / (maxp-minp);
    return Math.exp(minv + scale*(position-minp));
}    

function linearScale(position, minp_, maxp_, minv_, maxv_) {
    var minp = minp_;
    var maxp = maxp_;
    var minv = minv_;
    var maxv = maxv_;

    var percent = (position - minp) / (maxp-minp);
    return percent * (maxv - minv) + minv;
}    

function createOsc(noteIndex) {
    tempOsc = audioCtx.createOscillator();
    if (chromatic) {
        tempOsc.frequency.value = midiToFreq(linearScale(notes[noteIndex].x, 0, canvas.width, 44, 96));
    }
    else {
        tempOsc.frequency.value = logScale(notes[noteIndex].x, 0, canvas.width, 100, 2000);
    }
    tempGain = audioCtx.createGain();
    tempGain.gain.value = 0;
    tempGain.gain.linearRampToValueAtTime((1 - linearScale(notes[noteIndex].y, 0, canvas.height, 0, 0.9)), audioCtx.currentTime + 0.01);
    tempOsc.connect(tempGain);
    tempGain.connect(masterGain);
    tempOsc.start();
    oscs[noteIndex] = tempOsc;
    gains[noteIndex] = tempGain;
}

function drawCircle(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.fillStyle = color || '#000000';
    ctx.arc(x,y,r, 0, Math.PI * 2);
    ctx.fill();
}

function Note() {
    this.x = 0;
    this.y = 0;
    this.distance = 0;
}

Note.prototype.setPosition = function(x, y) {
    this.x = x;
    this.y = y;
}

function dist(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2));
}

function init() {
    canvas = $('#dotCanvas')[0];
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.5;
    w = canvas.width;
    h = canvas.height;
    noteSize = Math.min(w, h) / 12;
    
    canvas.addEventListener('mousemove', mouseHandler, false);
    canvas.addEventListener('mouseout', mouseOutHandler, false);
    canvas.addEventListener('touchmove', touchHandler, false);
    canvas.addEventListener('touchstart', touchStartHandler, false);
    canvas.addEventListener('touchend', touchEndHandler, false);
    
    draw();
}

function draw() {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < numNotes; ++i) {
        drawCircle(ctx, notes[i].x, notes[i].y, noteSize, '#ff5733');
    }
}

function isOnNote(event, note) {
    return dist(event.pageX, event.pageY, note.x, note.y) < noteSize;
}

function deleteNote(index) {
    notes.splice(index, 1);
    oscs.splice(index, 1);
    gains[index].gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
    gains.splice(index, 1);
    numNotes--;
    selectedNote = -1;
    draw();
}

$(window).resize(function() {
    init(); 
});

$(document).mousedown(function(e) {
    var minDistance = 100000;
    var tempNoteID = -1;
    for (var i = 0; i < numNotes; i++) {
        var distance = dist(e.pageX, e.pageY, notes[i].x, notes[i].y);
        if (minDistance >= distance) {
            minDistance = distance;
            tempNoteID = i;
        }
    }
    if (tempNoteID > -1 && minDistance < noteSize) {
        selectedNote = tempNoteID;
    }
});

function mouseHandler(e) {
    if (selectedNote < 0) return;
    notes[selectedNote].setPosition(e.pageX, e.pageY);
    draw();
    if (chromatic) {
        oscs[selectedNote].frequency.value = midiToFreq(linearScale(notes[selectedNote].x, 0, canvas.width, 44, 96));
    }
    else {
        oscs[selectedNote].frequency.value = logScale(notes[selectedNote].x, 0, canvas.width, 100, 2000);
    }
    gains[selectedNote].gain.linearRampToValueAtTime((1 - linearScale(notes[selectedNote].y, 0, canvas.height, 0, 0.9)), audioCtx.currentTime + 0.01);
    
    event.preventDefault();
}

function mouseOutHandler(e) {
    if (selectedNote < 0) return;
    deleteNote(selectedNote);
    selectedNote = -1;
}

$(document).mouseup(function(e) {
    selectedNote = -1;
});

function touchStartHandler(e) {
    event.preventDefault();
    var minDistance = 100000;
    var tempNoteID = -1;
    var changes = e.changedTouches;
    for (var i = 0; i < changes.length; ++i) {
        for (var j = 0; j < numNotes; j++) {
            var distance = dist(changes[i].pageX, changes[i].pageY, notes[j].x, notes[j].y);
            if (minDistance >= distance) {
                minDistance = distance;
                tempNoteID = j;
            }
        }
        if (tempNoteID > -1 && minDistance < noteSize) {
            selectedNotes.add(tempNoteID);
        }
    }  
}

function touchHandler(e) {
    if (selectedNotes.size == 0) return;
    e.preventDefault();
    var touches = e.changedTouches;
    for (var i = 0; i < touches.length; ++i) {
        for (var j = 0; j < numNotes; ++j) {
            if (isOnNote(touches[i], notes[j])) {
                notes[j].setPosition(touches[i].pageX, touches[i].pageY);
                draw();
                if (chromatic) {
                    oscs[j].frequency.value = midiToFreq(linearScale(notes[j].x, 0, canvas.width, 44, 96));
                }
                else {
                    oscs[j].frequency.value = logScale(notes[j].x, 0, canvas.width, 100, 2000);
                }
                gains[j].gain.linearRampToValueAtTime((1 - linearScale(notes[j].y, 0, canvas.height, 0, 0.9)), audioCtx.currentTime + 0.01);
                if (notes[j].y > canvas.height || notes[j].x < 0 || 
                   notes[j].y < 0 || notes[j].x > canvas.width) {
                    deleteNote(j);
                }
            }
        }
    }
    
    
}

function touchEndHandler(e) {
    var changes = e.changedTouches;
    for (var i = 0; i < changes.length; ++i) {
        for (var j = 0; j < numNotes; ++j) {
            if (isOnNote(changes[i], notes[j])) {
                selectedNotes.delete(j);
            }
        }
    }
    selectedNote = -1;
}











