/* 
 * Connect to Blackmagic ATEM Switcher and react on tally state change
 */
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






/* 
 * Handle General Tally logic
 */

function atemPreviewChanged(state) {
    lastAtemInputPreviewState = atemInputPreviewState;
    atemInputPreviewState = state;
    handleRemoteTallyStateChange();
    handleWebsocketsStateChanged();
}
function atemProgramChanged(state) {
    lastAtemInputProgramState = atemInputProgramState;
    atemInputProgramState = state;
    handleRemoteTallyStateChange();
    handleWebsocketsStateChanged();
}

function atemInTransitionChanged(state) {
    console.log('atemInTransitionChanged:' + state);
    lastAtemInTransition = atemInTransition;
    atemInTransition = state;
    handleRemoteTallyStateChange();
    handleWebsocketsStateChanged();
}







/* 
 * Handle Remote Tally logic
 */

function setRemoteProgramTally() {
    blink.fadeToRGB(100, 255, 0, 0, 0);
}

function setRemoteProgramTallyWithAttention() {
    let onTime = 50;
    let offTime = 50;
    let blinkTimes = 2;

    // switchOns
    for(let i=0; i<blinkTimes+1; i++) {
        setTimeout(() => {
            blink.fadeToRGB(0, 255, 0, 0, 1);
            blink.fadeToRGB(0, 0, 0, 0, 2);
        },(onTime+offTime)*i);
    }

    // switch Offs
    for(let i=0; i<blinkTimes; i++) {
        setTimeout(() => {
            blink.fadeToRGB(0, 0, 0, 0, 1);
            blink.fadeToRGB(0, 255, 0, 0, 2);
        },offTime+i*(onTime+offTime));
    }
}

function setRemotePreviewTally() {
    blink.fadeToRGB(100, 0, 200, 0, 0);
}

function setRemoteInTransitionTally() {
    blink.fadeToRGB(100, 255, 0, 0, 1);
    blink.fadeToRGB(100, 0, 0, 255, 2);
}

function setRemoteTallyOff(params) {
    blink.off();
}

function handleRemoteTallyStateChange() {
    console.log('handleRemoteTallyStateChange:');
    console.log({
        panasonicRemotePanelSelectedCamera,
        atemInputPreviewState,
        atemInputProgramState,
        atemInTransition
    });

    // handle Remote Tally
    if(panasonicRemotePanelSelectedCamera === atemInputProgramState) {
        if(atemInTransition) {
            setRemoteInTransitionTally();
        } else {
            if(panasonicWasChanged) {
                setRemoteProgramTallyWithAttention();
            } else {
                setRemoteProgramTally();
            }   
        }
    } else if(panasonicRemotePanelSelectedCamera === atemInputPreviewState) {
        if(atemInTransition) {
            setRemoteInTransitionTally();
        } else {
            setRemotePreviewTally();
        }
    } else {
        setRemoteTallyOff();
    }
    panasonicWasChanged = false;
}






/* 
 * Control blink(1) Light
 */

var Blink1 = require('node-blink1');
const blinks = Blink1.devices(); // returns array of serial numbers
let blink;

if(blinks.length > 0) {
    blink = new Blink1(blinks[0]);
}








/* 
 * Connect via Websocket to Panasonic Remote Panel AW-RP-150
 */
var app = require('express')();
var http = require('http');
var httpServer = http.createServer(app);
var ioClient = require('socket.io-client');

var CONFIG = {};
CONFIG.host = '172.17.121.14';
CONFIG.port = 3001;

// socket.io
client = ioClient.connect('http://'+CONFIG.host+':'+CONFIG.port,{
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

function panasonicRemotePanelSelectedCameraChanged(selectedCamera) {
    lastPanasonicRemotePanelSelectedCamera = panasonicRemotePanelSelectedCamera;
    panasonicRemotePanelSelectedCamera = selectedCamera
    console.log('Panasonic Remote Panel - Selected Camera: ' +  selectedCamera);
    panasonicWasChanged = true;
    handleRemoteTallyStateChange();
}








/* 
 * Websocket Server for Websocket Tally
 */
var websocketClients = new Array();
var port = 3000;
var io = require('socket.io')(httpServer);


httpServer.listen(port, () => {
  console.log('Websockets listening on *:' + port);
});

// Authentication
io.use(function(socket, next){
  // console.log("Query: ", socket.handshake.query);
  // return the result of next() to accept the connection.
  if (socket.handshake.query.authentication == "sDJZn16TuP7zu82a") {
      return next();
  }
  // call next() with an Error if you need to reject the connection.
  next(new Error('Authentication error'));
});

// on conncection
io.on('connection', function(socket){
  console.log('Websocket client connected');

  // add client to clientlist
  websocketClients.push(socket);

  // return 'connected'
  socket.emit('connetion',true);


  socket.on('disconnect', function(){
    console.log('Client disconnected');
  });
});

function sendCommandToAllWebsocketClients(key, value) {
  websocketClients.forEach(function (websocketClient) {
    websocketClient.emit(key, value);
  });
}


function handleWebsocketsStateChanged() {
    var websocketCameraNumber = 4;

    // handle Remote Tally
    if(websocketCameraNumber === atemInputProgramState) {
        if(atemInTransition) {
            sendCommandToAllWebsocketClients('websocketTally', {
                command: 'tally/transition',
                camera: 'mobil'
            });
        } else {
            sendCommandToAllWebsocketClients('websocketTally', {
                command: 'tally/program',
                camera: 'mobil'
            });
        }
    } else if(websocketCameraNumber === atemInputPreviewState) {
        if(atemInTransition) {
            sendCommandToAllWebsocketClients('websocketTally', {
                command: 'tally/transition',
                camera: 'mobil'
            });
        } else {
            sendCommandToAllWebsocketClients('websocketTally', {
                command: 'tally/preview',
                camera: 'mobil'
            });
        }
    } else {
        sendCommandToAllWebsocketClients('websocketTally', {
            command: 'tally/off',
            camera: 'mobil'
        });
    }
}