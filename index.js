const { Atem } = require('atem-connection')
const myAtem = new Atem()
myAtem.on('info', console.log)
myAtem.on('error', console.error)

myAtem.connect('172.17.121.61')

let atemInputProgramState = 0;
let lastAtemInputProgramState = 0;
let atemInputPreviewState = 0;
let lastAtemInputPreviewState = 0;
let atemInTransition = false;
let lastAtemInTransition = false;
let panasonicRemotePanelSelectedCamera = 0;
let lastPanasonicRemotePanelSelectedCamera = 0;
let panasonicWasChanged = false;

myAtem.on('connected', () => {
	// myAtem.changeProgramInput(3).then(() => {
	// 	// Fired once the atem has acknowledged the command
	// 	// Note: the state likely hasnt updated yet, but will follow shortly
	// 	console.log('Program input set')
	// })
	// console.log(myAtem.state)
})

myAtem.on('stateChanged', (state, pathToChange) => {
    if(state.video.ME['0']) {
        if(lastAtemInputProgramState !== state.video.ME['0'].programInput) {
            atemProgramChanged(state.video.ME['0'].programInput);
        }
        if(lastAtemInputPreviewState !== state.video.ME['0'].previewInput) {
            atemPreviewChanged(state.video.ME['0'].previewInput);
        }
        if(lastAtemInTransition !== state.video.ME['0'].inTransition) {
            atemInTransitionChanged(state.video.ME['0'].inTransition);
        }
    }

});

function atemPreviewChanged(state) {
    lastAtemInputPreviewState = atemInputPreviewState;
    atemInputPreviewState = state;
    handleStateChange();
}
function atemProgramChanged(state) {
    lastAtemInputProgramState = atemInputProgramState;
    atemInputProgramState = state;
    handleStateChange();
}

function atemInTransitionChanged(state) {
    console.log('atemInTransitionChanged:' + state);
    lastAtemInTransition = atemInTransition;
    atemInTransition = state;
    handleStateChange();
}

function setProgramTally() {
    switchOn(255,0,0);
}

function setProgramTallyWithAttention() {
    let onTime = 50;
    let offTime = 50;
    let blinkTimes = 2;

    // switchOns
    for(let i=0; i<blinkTimes+1; i++) {
        setTimeout(() => {
            // switchOn(255,0,0);
            blink.fadeToRGB(0, 255, 0, 0, 1);
            blink.fadeToRGB(0, 0, 0, 0, 2);
        },(onTime+offTime)*i);
    }

    // switch Offs
    for(let i=0; i<blinkTimes; i++) {
        setTimeout(() => {
            blink.fadeToRGB(0, 0, 0, 0, 1);
            blink.fadeToRGB(0, 255, 0, 0, 2);
            // switchOff();
        },offTime+i*(onTime+offTime));
    }
}

function setPreviewTally() {
    // switchOn(0,255,0);
    blink.fadeToRGB(100, 0, 200, 0, 0);
}

function setInTransitionTally() {
    // switchOn(0,0,255);
    blink.fadeToRGB(100, 255, 0, 0, 1);
    blink.fadeToRGB(100, 0, 0, 255, 2);
}

function setTallyOff(params) {
    switchOff();
}

function panasonicRemotePanelSelectedCameraChanged(selectedCamera) {
    lastPanasonicRemotePanelSelectedCamera = panasonicRemotePanelSelectedCamera;
    panasonicRemotePanelSelectedCamera = selectedCamera
    console.log('Panasonic Remote Panel - Selected Camera: ' +  selectedCamera);
    panasonicWasChanged = true;
    handleStateChange();
}

function handleStateChange() {
    console.log('handleStateChange:');
    console.log({
        panasonicRemotePanelSelectedCamera,
        atemInputPreviewState,
        atemInputProgramState,
        atemInTransition
    });

    if(panasonicRemotePanelSelectedCamera === atemInputProgramState) {
        if(atemInTransition) {
            setInTransitionTally();
        } else {
            if(panasonicWasChanged) {
                setProgramTallyWithAttention();
            } else {
                setProgramTally();
            }   
        }
    } else if(panasonicRemotePanelSelectedCamera === atemInputPreviewState) {
        if(atemInTransition) {
            setInTransitionTally();
        } else {
            setPreviewTally();
        }
    } else {
        setTallyOff();
    }
    panasonicWasChanged = false;
}


var Blink1 = require('node-blink1');
const blinks = Blink1.devices(); // returns array of serial numbers
let blink;

if(blinks) {
    blink = new Blink1(blinks[0]);
}

function switchOn(r,g,b) {
    blink.setRGB(r,g,b);
}

function switchOff() {
    blink.off();
}















var io = require('socket.io-client');

var CONFIG = {};
CONFIG.host = '172.17.121.14';
CONFIG.port = 3001;

// socket.io
client = io.connect('http://'+CONFIG.host+':'+CONFIG.port,{
  query: "authentication=sDJZn16TuP7zu82a"
});

// on connection
client.on('connect',function() {
  console.log('Successfully connected to http://'+CONFIG.host+':'+CONFIG.port);
});

// on disconnect
client.on('disconnect', function(){
    console.log('Lost connection to http://'+CONFIG.host+':'+CONFIG.port);
});

// recieve content from server
client.on('selectedCamera',function(data) {
  panasonicRemotePanelSelectedCameraChanged(data);
});