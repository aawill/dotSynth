var generatePerson = function(online) {
    var dotSynthChatUser = JSON.parse(localStorage.getItem("dotSynthChatUser"));
    if (dotSynthChatUser) {
        return dotSynthChatUser;
    }

    var person = {};

    person.uuid = String(new Date().getTime());
    person.online = online || false;

    localStorage.setItem('dotSynthChatUser', JSON.stringify(person));
    return person;
}

ChatEngine = ChatEngineCore.create({
    subscribeKey: 'sub-c-d6b86928-685a-11e8-a49b-66b3abd5adf6', 
    publishKey: 'pub-c-23853200-9b88-458a-9b3a-89f2094e3f99' 
});

let newPerson = generatePerson(true);

let dotSynthChat;

const init = () => {
    ChatEngine.connect(newPerson.uuid, newPerson);
    
    ChatEngine.on('$.ready', function(data) {
        me = data.me;
        dotSynthChat = new ChatEngine.Chat('dotSynth-chat');
        
        dotSynthChat.on('message', (message) => {
            renderMessage(message);
        });
        
        //$('#newDot').click(sendMessage('noteCreate'));
        $('#newDot').click(function() {
            sendMessage('create');
        });
        // why the hell does this work but the one line version doesn't??
    });
};

function sendMessage(command, noteIndex, xVal, yVal, chromaVal) {
    switch(command) {
        case 'create':
            dotSynthChat.emit('message', {
                function: command
            });
            break;
        case 'move':
            dotSynthChat.emit('message', {
                function: command,
                index: noteIndex,
                x: xVal,
                y: yVal,
                chroma: chromaVal
            });
            break;
        case 'delete':
            dotSynthChat.emit('message', {
                function: command,
                index: noteIndex
            });
    }
};

function renderMessage(m) {
    switch(m.data.function) {
        case 'create':
            if (m.sender.uuid == me.uuid) {
                newMyNote();
            }
            else {
                newElseNote();
            }
            break;
        case 'move':
            if (m.sender.uuid != me.uuid) {
                moveElseNote(m.data.index, m.data.x, m.data.y);
            }
            break;
        case 'delete':
            if (m.sender.uuid != me.uuid) {
                deleteElseNote(m.data.index);
            }
            break;
    }
}

$(document).ready(function() {
    init();
    audioCtx = new (window.AudioContext || window.webkitAudioContext);
    masterGain = audioCtx.createGain();
    masterComp = audioCtx.createDynamicsCompressor();
    masterGain.connect(masterComp);
    masterComp.connect(audioCtx.destination);
    initCanvas();
    $('#speakerIcon').click(function() {
        toggleSound();
    });
    $('#chromatic').click(function() {
        chromatic = true;
    });
    $('#free').click(function() {
        chromatic = false;
    });
    $('#deleteAll').click(function() {
        while (numMyNotes > 0) {
            deleteMyNote(0);
            sendMessage('delete', 0);
        }
    });
});

// creating a moveable note for me
function newMyNote() {
    audioCtx.resume();
    note = new Note();
    note.setPosition(canvas.width / 2, canvas.height / 2);
    note.filter.frequency.value = (logScale(note.y, 0, canvas.height, 5000, 100));
    note.osc.start();
    myNotes[numMyNotes] = note;
    numMyNotes++;
    draw();
}

function deleteMyNote(index) {
    myNotes[index].gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
    myNotes[index].osc.stop(audioCtx.currentTime + 0.01);
    myNotes.splice(index, 1);
    numMyNotes--;
    draw();
}

// representing other users' notes
function newElseNote() {
    audioCtx.resume();
    note = new Note();
    note.setPosition(canvas.width / 2, canvas.height / 2);
    note.filter.frequency.value = (logScale(note.y, 0, canvas.height, 5000, 100));
    note.osc.start();
    elseNotes[numElseNotes] = note;
    numElseNotes++;
    draw();
}

// x and y must be relative values between 0 and 1
function moveElseNote(index, x, y, chroma) {
    currentNote = elseNotes[index];
    x *= canvas.width;
    y *= canvas.height;
    currentNote.setPosition(x,  y);
    draw();
    if (chroma) {
        currentNote.osc.frequency.value = midiToFreq(linearScale(
            currentNote.x, 0, canvas.width, 44, 96));
    }
    else {
        currentNote.osc.frequency.value = logScale(currentNote.x, 0, canvas.width, 100, 2000);
    }
    
    currentNote.filter.frequency.value = (logScale(currentNote.y, 0, canvas.height, 2500, 150));
}

function deleteElseNote(index) {
    elseNotes[index].gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
    elseNotes[index].osc.stop(audioCtx.currentTime + 0.01);
    elseNotes.splice(index, 1);
    numElseNotes--;
    draw();
}

function toggleSound() {
    var sound = $('#speakerIcon');
    if (sound.hasClass('active')) {
            masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
            sound.attr('src', 'https://i.imgur.com/HeEZ2bf.png');
            sound.removeClass('active');
    }
    else {
        masterGain.gain.linearRampToValueAtTime(0.9, audioCtx.currentTime + 0.01);
        sound.attr('src', 'https://i.imgur.com/oCYMca6.png');
        sound.addClass('active');
    }
}

var numMyNotes = 0;
var numElseNotes = 0;
var myNotes = [];
var elseNotes = [];
var chromatic = false;
var selectedNote = -1;
var selectedNotes = new Set([]);

function midiToFreq(midiNote) {
    midiNote = Math.floor(midiNote);
    return 27.5 * Math.pow(2, ((midiNote - 21) / 12));
}

//scales position from minp_ and maxp_ to minv_ and maxv_ logarthithmically
function logScale(position, minp_, maxp_, minv_, maxv_) {
    var minp = minp_;
    var maxp = maxp_;
    var minv = Math.log(minv_);
    var maxv = Math.log(maxv_);

    var scale = (maxv-minv) / (maxp-minp);
    return Math.exp(minv + scale*(position-minp));
}    

//scales position from minp_ and maxp_ to minv_ and maxv_ linearly
function linearScale(position, minp_, maxp_, minv_, maxv_) {
    var minp = minp_;
    var maxp = maxp_;
    var minv = minv_;
    var maxv = maxv_;

    var percent = (position - minp) / (maxp-minp);
    return percent * (maxv - minv) + minv;
}    

function drawCircle(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.fillStyle = color || '#000000';
    ctx.arc(x,y,r, 0, Math.PI * 2);
    ctx.fill();
}

// class declaration for Note object
function Note() {
    this.x = 0;
    this.y = 0;
    this.osc = audioCtx.createOscillator();
    this.filter = audioCtx.createBiquadFilter();
    this.gainNode = audioCtx.createGain();

    this.osc.type = "triangle";
    this.filter.type = "bandpass";
    this.osc.connect(this.filter);
    this.filter.connect(this.gainNode);
    this.gainNode.connect(masterGain);
    this.touchID = -1;
}

Note.prototype.setPosition = function(x, y) {
    this.x = x;
    this.y = y;
}

function dist(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2));
}

function initCanvas() {
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
    for (var i = 0; i < numMyNotes; ++i) {
        drawCircle(ctx, myNotes[i].x, myNotes[i].y, noteSize, 'rgb(255, 0, 0, 0.8)');
    }
    for (var j = 0; j < numElseNotes; ++j) {
        drawCircle(ctx, elseNotes[j].x, elseNotes[j].y, noteSize, 'rgb(0, 0, 255, 0.8)')
    }
}

$(window).resize(function() {
    initCanvas(); 
});

$(document).mousedown(function(e) {
    var minDistance = 100000;
    var tempNoteID = -1;
    for (var i = 0; i < numMyNotes; i++) {
        var distance = dist(e.pageX, e.pageY, myNotes[i].x, myNotes[i].y);
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
    var currentNote = myNotes[selectedNote];
    currentNote.setPosition(e.pageX, e.pageY);
    draw();
    
    // sends note position as relative val between 0 and 1
    sendMessage('move', selectedNote, (currentNote.x / canvas.width), 
                (currentNote.y / canvas.height), chromatic);
    
    if (chromatic) {
        currentNote.osc.frequency.value = midiToFreq(linearScale(
            currentNote.x, 0, canvas.width, 44, 96));
    }
    else {
        currentNote.osc.frequency.value = logScale(currentNote.x, 0, canvas.width, 100, 2000);
    }
    
    currentNote.filter.frequency.value = (logScale(currentNote.y, 0, canvas.height, 2500, 150));
    event.preventDefault();
}

function mouseOutHandler(e) {
    if (selectedNote < 0) return;
    deleteMyNote(selectedNote);
    sendMessage('delete', selectedNote);
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
        for (var j = 0; j < numMyNotes; j++) {
            var distance = dist(changes[i].pageX, changes[i].pageY, myNotes[j].x, myNotes[j].y);
            if (minDistance >= distance) {
                minDistance = distance;
                tempNoteID = j;
            }
        }
        if (tempNoteID > -1 && minDistance < noteSize) {
            myNotes[tempNoteID].touchID = changes[i].identifier;
            selectedNotes.add(myNotes[tempNoteID]);
        }
    }  
}

function touchHandler(e) {
    if (selectedNotes.size == 0) return;
    e.preventDefault();
    var touches = e.changedTouches;
    for (var i = 0; i < touches.length; ++i) {
        for (var j = 0; j < numMyNotes; ++j) {
            if (myNotes[j].touchID == touches[i].identifier) {
                var currentNote = myNotes[j];
                currentNote.setPosition(touches[i].pageX, touches[i].pageY);
                draw();
                if (chromatic) {
                    currentNote.osc.frequency.value = midiToFreq(linearScale(currentNote.x, 0, canvas.width, 44, 96));
                }
                else {
                    currentNote.osc.frequency.value = logScale(currentNote.x, 0, canvas.width, 100, 2000);
                }
                currentNote.filter.frequency.value = (logScale(currentNote.y, 0, canvas.height, 2500, 150));
                if (currentNote.y > canvas.height || currentNote.x < 0 || 
                   currentNote.y < 0 || currentNote.x > canvas.width) {
                    deleteMyNote(j);
                }
            }
        }
    }
}

function touchEndHandler(e) {
    var changes = e.changedTouches;
    for (var i = 0; i < changes.length; ++i) {
        for (var j = 0; j < numMyNotes; ++j) {
            if (myNotes[j].touchID == changes[i].identifier) {
                var currentNote = myNotes[j];
                currentNote.touchID = -1;
                selectedNotes.delete(currentNote);
            }
        }
    }
}











