var oscPathFreqBandMap = [  "/muse/elements/delta_absolute", "delta",
                            "/muse/elements/theta_absolute", "theta",
                            "/muse/elements/alpha_absolute", "alpha",
                            "/muse/elements/beta_absolute",  "beta",
                            "/muse/elements/gamma_absolute", "gamma" ];

var CHANNELS = [{name: 'T9',  index: 1},
                {name: 'Fp1', index: 2},
                {name: 'Fp2', index: 3},
                {name: 'T10', index: 4}],
    SELECTED_CHANS = [{name: 'T9', index: 1},
                      {name: 'Fp1', index: 2}];//default: T9 + Fp1

//Frequency band name and idx mapping
var FREQ_BANDS = [  {name: 'delta', index: 0},
                    {name: 'theta', index: 1},
                    {name: 'alpha', index: 2},
                    {name: 'beta',  index: 3},
                    {name: 'gamma', index: 4}],
    SELECTED_FREQ_BANDS = [ {name: 'alpha', index: 2},
                            {name: 'beta', index: 3}];//default: alpha/beta

var MOV_AVG;

var DIVIDEND = [], DIVISOR = [];
var RATIO = [];
var RATIO_MIN = 0.5, RATIO_MAX = 0;

var ExperimentController = require('./ExperimentController.js');

function MainController(){
    this.init();
}

MainController.prototype.init = function(){
    this.osc = require('./dependencies/node-osc/lib/osc');
    //WebSocket = require("websocket");
    var app = require('http').createServer(this.handler);
    this.io = require('socket.io')(app);
    var fs = require('fs');
    app.listen(80);

    var util = require('util');

    //moving average
    var MA = require('./dependencies/moving-average.js');
    var timeInterval = 60 * 1000; // 1 minute
    MOV_AVG = [ ['delta', 0, 0, 0, 0],
        ['theta', 0, 0, 0, 0],
        ['alpha', 0, 0, 0, 0],
        ['beta',  0, 0, 0, 0],
        ['gamma', 0, 0, 0, 0] ];
    for(var i = 0; i < FREQ_BANDS.length; i++){
        MOV_AVG[i][0] = FREQ_BANDS[i].name;
        CHANNELS.forEach(function(el, idx){
            MOV_AVG[i][el.index] = MA(timeInterval);
        });
    }

    //gauss for movinge percentile
    //var Calibration = require('./Calibration.js');
    //this.calibration = new Calibration(10);

    //connection to browser via WebSocket
    this.onWebSocketConnection();
};

MainController.prototype.handler = function(){
    return function(req, res) {
        fs.readFile(path.join(__dirname, '..', 'index.html'),
            function (err, data) {
                if (err) {
                    res.writeHead(500);
                    return res.end('Error loading index.html');
                }

                res.writeHead(200);
                res.end(data);
            });
    }
};

MainController.prototype.onWebSocketConnection = function(){
    var self = this;
    //connection with Browser via WebSocket
    this.io.on('connection', function (socket) {
        console.log("WebSocket connected..");

        /*** BLUE SIDEBAR ***/
        //channel selection lsitener
        self.channelSelectionListener(socket);
        //frequency band selection listener
        self.frequencyBandSelectionListener(socket);

        /****** RED SIDEBAR ****/
        //listen for new experiment btn click
        self.newExperimentListener(socket);
        //listen for experiment start btn click
        self.experimentStartListener(socket);
        //listen for experiment mode change
        self.experimentModeListener(socket);

        //receive OSC messages on UDP port 5002 and refer them to index.html
        self.oscServer = new self.osc.Server(5002, '0.0.0.0');
        //listen for osc messaged from muse
        self.oscListener(socket);
    });
};

MainController.prototype.updateBoids = function(socket){
    var self = this;
    setInterval(
        function(){
            if(ANIMATION_RUNNING) {
                self.boidController.flock();
            }
        } , 10
    );
};

/**
 * New experiment button clicked + Age and Gender dialog submitted.
 * @param socket
 */
MainController.prototype.newExperimentListener = function(socket){
    var self = this;
    socket.on('newExperiment', function(data){//no data
        console.log('new experiment set up for ' + data.age + ', '+ data.gender + ', ' + 'mode: ' + data.mode);
        //init experiment with mode, gender  and age
        self.experimentController = new ExperimentController(data.age, data.gender, data.mode, socket);
    });
};

//listen for "start experiment" btn press
MainController.prototype.experimentStartListener = function(socket){
    var self = this;
    socket.on('startExperimentButton', function(data){// data.mode = experiment mode idx
        if(self.experimentController !== 'undefined'){ //data.duration = duration of experiment mode in seconds
            console.log('startExperimentButton clicked');
            //set mode
            self.experimentController.setMode(data.mode);
            //set duration in seconds, default = 60
            self.experimentController.setDuration(data.duration);
            switch(data.mode){
                //start CALIBRATION
                case 0:
                    //calibrate
                    self.experimentController.calibrate(
                        SELECTED_FREQ_BANDS[0].name,
                        SELECTED_FREQ_BANDS[1].name,
                        SELECTED_CHANS[0].index,
                        10,
                        SELECTED_CHANS[1].index,
                        10,
                        (function (percentiles) {
                            console.log('experiment mode ' + data.mode + ' stopped.');
                            socket.emit('experimentStopped', {mode: data.mode, percentiles: percentiles});
                        })
                    );
                    break;
                //start TEST 1
                case 1:
                    //socket.emit('experimentStopped', {mode: data.mode, data: xyz});
                    break;
                // start FREE NEUROFEEDBACK
                case 2:
                    //socket.emit('experimentStopped', {mode: data.mode, data: xyz});
                    break;
                //start TEST 2
                case 3:
                    //socket.emit('experimentStopped', {mode: data.mode, data: xyz});
                    break;
            }
        }
    });
};

MainController.prototype.experimentModeListener = function(socket){
    var self = this;
    socket.on('modeSelection', function(data){
        console.log('experiment mode changed to ' + data.mode);
        self.experimentController.setMode(data.mode);
    });
};

MainController.prototype.channelSelectionListener = function(socket){
    var self = this;
    //receive channel selection changes
    socket.on('channelSelection', function (data) {
        console.log(data);
        data.selectedChannels.forEach(function (channel, idx) {
            SELECTED_CHANS[idx] = CHANNELS[channel];
        });
        console.log("amount channels: " + SELECTED_CHANS.length);
        // get quantiles from Calibration for newly selected channels and send them via websocket
        socket.emit('percentiles', {
            percentiles: self.experimentController.getQuantileResults(SELECTED_FREQ_BANDS[0].name, SELECTED_FREQ_BANDS[1].name,
                SELECTED_CHANS[0].index, 10, SELECTED_CHANS[1].index, 10)
        });

        //set RATIOS back to default
        RATIO_MAX = 0;
        RATIO_MIN = 0.5;
    });
};

MainController.prototype.frequencyBandSelectionListener = function(socket){
    var self = this;
    //receive frequency selection changes
    socket.on('frequencyBandSelection', function (data) {
        console.log(data);
        //SELECTED_FREQ_BANDS = data.selectedFrequencyBands;
        data.selectedFrequencyBands.forEach(function (band, idx) {
            SELECTED_FREQ_BANDS[idx] = FREQ_BANDS[band];
        });
        //get quantiles from Calibration for newly selected bands and send them over websocket
        socket.emit('percentiles', {
            percentiles: self.experimentController.getQuantileResults(SELECTED_FREQ_BANDS[0].name, SELECTED_FREQ_BANDS[1].name,
                SELECTED_CHANS[0].index, 10, SELECTED_CHANS[1].index, 10)
        });
        //set RATIOS back to default
        RATIO_MAX = 0;
        RATIO_MIN = 0.5;
    });
};

MainController.prototype.oscListener = function(socket){
    var self = this;
    this.oscServer.on("message", function (msg) {
        //console.log("Message:");
        // console.log(msg);
       //socket.emit('osc', {osc: msg});
        if (msg[0] === "/muse/elements/delta_absolute"
            || msg[0] === "/muse/elements/theta_absolute"
            || msg[0] === "/muse/elements/alpha_absolute"
            || msg[0] === "/muse/elements/beta_absolute"
            || msg[0] === "/muse/elements/gamma_absolute")
        {
            //CALIBRATION RUNNING
            if(typeof self.experimentController !== 'undefined'
                && self.experimentController.getExperimentRunning())
            {
                var collMsg = msg;
                collMsg[0] = getFrequencyBandByOSCPath(msg[0]);
                console.log('calibrating...');
                self.experimentController.addToCollection(collMsg);
            }


            SELECTED_FREQ_BANDS.forEach(function(selBand, selIdx)
            {
                /*CHANNELS.forEach(function(el, idx) {
                    //add values to moving average
                    MOV_AVG[selBand.index][el.index].push(Date.now(), Math.pow(10,msg[el.index]));
                    //console.log('moving average of ' + MOV_AVG[selBand.index][0] + ' now is', MOV_AVG[selBand.index][el.index].movingAverage());
                    // console.log('moving variance now is', MOV_AVG[selBand.index][el.index].variance());
                });*/

                if(msg[0].indexOf(selBand.name) !== -1)
                {
                    FREQ_BANDS.forEach(function(allBand, allIdx)
                    {
                        if( selBand.index === allBand.index )
                        {
                            if(selIdx === 0){
                                //console.log(allBand.name + ': ' + msg);
                                setDividend(selBand.name, msg.slice(1));
                                if(SELECTED_FREQ_BANDS.length === 1)
                                    setDivisor('', [1,1,1,1]);
                                setRatio();
                                if(RATIO[1] > RATIO_MAX){
                                    RATIO_MAX = RATIO[1];
                                    socket.emit('ratio_max',{ratio_max: RATIO_MAX});
                                }
                                if(RATIO[1] < RATIO_MIN){
                                    RATIO_MIN = RATIO[1];
                                    socket.emit('ratio_min',{ratio_min: RATIO_MIN});
                                }
                                socket.emit('ratio', {ratio: RATIO});
                            }else if(selIdx === 1){
                                //console.log(allBand.name + ': ' + msg);
                                setDivisor(selBand.name, msg.slice(1));
                                setRatio();
                                if(RATIO[1] > RATIO_MAX){
                                    RATIO_MAX = RATIO[1];
                                    socket.emit('ratio_max',{ratio_max: RATIO_MAX});
                                }
                                if(RATIO[1] < RATIO_MIN){
                                    RATIO_MIN = RATIO[1];
                                    socket.emit('ratio_min',{ratio_min: RATIO_MIN});
                                }
                                socket.emit('ratio', {ratio: RATIO});
                            }
                        }
                    });
                }
            });

        }else if(msg[0] === '/muse/elements/horseshoe'){
            socket.emit('horseshoe', {horseshoe: msg});
        }
    });
    /*
     switch(msg[0]) {
     /**
     * Delta = 0
     * Theta = 1
     * Alpha = 2
     * Beta  = 3
     * Gamma = 4
     *//*
     case "/muse/elements/delta_absolute":

     break;
     case "/muse/elements/theta_absolute":
     frequencyBandsAbsolute(data, FREQ_BANDS[1]);
     break;
     case "/muse/elements/alpha_absolute":
     frequencyBandsAbsolute(data, FREQ_BANDS[2]);
     break;
     case "/muse/elements/beta_absolute":
     frequencyBandsAbsolute(data, FREQ_BANDS[3]);
     break;
     case "/muse/elements/gamma_absolute":
     frequencyBandsAbsolute(data, FREQ_BANDS[4]);
     break;
     /*** Raw FFT ****/
    /*    case "/muse/elements/raw_fft0":
     break;
     case "/muse/elements/raw_fft1":
     //raw_fft(data, "Fp1", constants);
     break;
     case "/muse/elements/raw_fft2":
     //raw_fft(data, "Fp2", constants);
     break;
     case "/muse/elements/raw_fft3":
     // raw_fft(data, "T10", constants);
     break;
     /******HORSESHOE ****/
    /*         case "/muse/elements/horseshoe":
     self.setHorseshoe(data);
     break;
     }
     });*/

};

function getFrequencyBandByOSCPath(oscPath){
    return bandName = oscPathFreqBandMap[oscPathFreqBandMap.indexOf(oscPath)+1];
}

function setDividend(freqBandName, data){
    var medFreq = 0;
    var chanCount = 0;
    SELECTED_CHANS.forEach(function(el, idx){
        medFreq += data[el.index-1];
        chanCount++;
    });
    DIVIDEND = [freqBandName, medFreq/chanCount];
    //console.log( freqBandName + ': ' + DIVIDEND[1]);
}

function setDivisor(freqBandName, data){
    var medFreq = 0;
    var chanCount = 0;
    SELECTED_CHANS.forEach(function(el, idx){
        medFreq += data[el.index-1];
        chanCount++;
    });
    DIVISOR = [freqBandName, medFreq/chanCount];
    //console.log( freqBandName + ': ' + DIVISOR[1]);
}

function setRatio(){
    RATIO = [DIVIDEND[0] + '/' + DIVISOR[0], (Math.pow(10, DIVIDEND[1])/Math.pow(10, DIVISOR[1]))];
}

new MainController();