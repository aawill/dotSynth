$(document).ready(function() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext);
    init();
    $("#newDot").click(function() {
        note = new Note();
        note.x = 40;
        note.y = 40;
        notes[numNotes] = note;
        createOsc(numNotes);
        numNotes++;
        draw();
    });
});

function logCalc(position) {
    var minp = 0;
    var maxp = canvas.width;
    var minv = Math.log(100);
    var maxv = Math.log(3000);

    var scale = (maxv-minv) / (maxp-minp);
    return Math.exp(minv + scale*(position-minp));
}    

function createOsc(noteIndex) {
    tempOsc = audioCtx.createOscillator();
    tempOsc.connect(audioCtx.destination);
    tempOsc.frequency.value = logCalc(notes[noteIndex].x);
    tempOsc.start();
    oscs[noteIndex] = tempOsc;
}

var notes = [];
var numNotes = 0;
var oscs = [];

function drawCircle(ctx, x,y,r, color) {
    ctx.beginPath();
    ctx.fillStyle = color || '#000000';
    ctx.arc(x,y,r, 0, Math.PI * 2);
    ctx.fill();
}

function Note(){
    this.x = 0;
    this.y = 0;
    this.distance = 0;
}

Note.prototype.setPosition = function(x, y) {
    this.x = x;
    this.y = y;
}

function dist(x1, y1, x2, y2){
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
    
    draw();
}

function draw() {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < numNotes; ++i) {
        drawCircle(ctx, notes[i].x, notes[i].y, noteSize, '#ff5733');
    }
}

var leftButtonDown = false;
var selectedNote = -1;

$(window).resize(function() {
    init(); 
});

$(document).mousedown(function(e) {
    leftButtonDown = true;
    var minDistance = 100000;
    var tempNoteID = -1;
    for (var i = 0; i < numNotes; i++){
        var distance = dist(e.pageX, e.pageY, notes[i].x, notes[i].y);
        if (minDistance >= distance){
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
    if (leftButtonDown) {
        notes[selectedNote].setPosition(e.pageX, e.pageY);
    }
    draw();
    oscs[selectedNote].frequency.value = logCalc(notes[selectedNote].x);
    event.preventDefault();
}

$(document).mouseup(function(e) {
    selectedNote = -1;
    leftButtonDown = false;
});












