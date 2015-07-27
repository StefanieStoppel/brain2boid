/**
 * Created by Stefanie on 10.05.2015.
 */


var COUNTDOWN = undefined;

function UIController(){
    /************************** MAIN AREA ***********************************/
    this.pointsDisplay = $('p.points-display');
    this.socketConnected = false;

    //Frequency band name and idx mapping
    this.frequencyBandNames = ['delta','theta','alpha','beta','gamma'];
    //frequency selection, array of numbers
    //TODO: FIX
    var self = this;
    this.selectedFrequencyIndices = [];
    //this.selectedFrequencies = $('option[name="fr-picker"]:selected').val().map(Number);
    $('option[name="fr-picker"]:selected').each(function(idx, el){
        self.selectedFrequencyIndices.push(parseInt($(el).val()));
    });

    //make array with absolute frequency bands. ratios will be calculated later.

    this.frequencyBandsAbs = [];
    $('input[name="fr-dividend"].fr-single').each(function(idx, el){
        self.frequencyBandsAbs.push([0,0,0,0]);
    });
    //set selected frequency band names in Constants
    this.bandNames = [];
    this.selectedFrequencyIndices.forEach(function(idx, el){
        if(el !== -1)
            self.bandNames.push(self.frequencyBandNames[idx]);
        else
            self.bandNames.push('none');
    });

    /****************************** GRAPHICS CONTROLLER, CONSTANTS *****************************/

    this.graphicsController = new GraphicsController();
    this.constants = this.graphicsController.getConstants();
    this.constants.setFrequencyBands(this.bandNames);


    /************************** SOCKET **********************/
    this.socket = io('http://localhost/');
    this.socket.on('connect', function(){
        self.onTimerUpdate();
        self.onTouchingForehead();
    });
    //todo. error handling +  connection schlieﬂen

    /******************************* OTHER UI CONTROLLERS ***************************************/
    this.experimentUIController = new ExperimentUIController(this.constants, this.graphicsController, this.socket, this);

    //*********************** LISTENERS for messages from node (nodeIndex or experimentController)
    this.onMuseConnected();
    this.socketRatio(this);
    this.onRatioMaxUpdate(this);
    this.onRatioMinUpdate(this);
    this.averageRatioUpdate(this);
    this.onHorseshoeUpdate();
    this.onIsGood();
    this.onBatteryUpdate();

   // this.showCircularCountdown(parseInt($('input[name="experiment-duration"]').val()));

    /**** POINTS RECEIVE & DISPLAY ***/
    this.onPointsUpdate();
    this.points = 0;
}

/**
 * Update points display in main area (left corner of svg field with boids)
 */
UIController.prototype.onPointsUpdate = function(){
    var self = this;
    this.socket.on('updatePoints', function(data){
        console.log('Points update received:' + data.points);
        self.points += data.points;
        self.pointsDisplay.html('<i class="fa fa-star"></i>' + self.points);
    });
};

UIController.prototype.resetPoints = function(){
    this.points = 0;
    this.pointsDisplay.html('<i class="fa fa-star"></i>' +this.points);
};

UIController.prototype.setCountdown = function(duration){
    $('#timer-text').text(duration + ' s');
};

UIController.prototype.onTimerUpdate = function(){
    var self = this;
    this.socket.on('timerUpdate', function(data){
        self.setCountdown(data.time);
    })
};

/******************************************* RATIO UPDATES ********************************/
//gets frequency ratio updates from node.js via websocket
UIController.prototype.socketRatio = function(self){
    this.socket.on('ratio', function(data){
        if(data.ratio[1] !== null){
            self.constants.updateRatio(data.ratio);
            //update bar chart in sidebar if sidebar is showing
            if(self.experimentUIController.getExperimentRunning() && getSidebarShowing())
                self.experimentUIController.updateRewardBarGraph(data.ratio);

        }
    });
};

//gets moving average frequency ratio updates from node.js via websocket
UIController.prototype.averageRatioUpdate = function(self){
    this.socket.on('mov_avg_ratio', function(data){
       // self.boidController.getConstants().setMovAvgRatio(data.mov_avg_ratio);
        console.log(data.bands + ' mov avg:\t' + data.mov_avg_ratio);
    });
};

UIController.prototype.onRatioMaxUpdate = function(self){
    this.socket.on('ratio_max', function(data){
        self.constants.setRatioMax(data.ratio_max);
        console.log('RATIO_MAX updated: ' + data.ratio_max);
        self.experimentUIController.updateRewardScaleMax(data.ratio_max);
    })
};

UIController.prototype.onRatioMinUpdate = function(self){
    this.socket.on('ratio_min', function(data){
        self.constants.setRatioMin(data.ratio_min);
        console.log('RATIO_MIN updated: ' + data.ratio_min);
    })
};

/********************* MUSE CONNECTION & ON FOREHEAD *******************/
UIController.prototype.onMuseConnected = function(){
    var self = this;
    this.socket.on('museConnected', function(data){
        self.experimentUIController.setMuseConnected(data.museConnected);
    });
};

/**
 * Experiment is paused when muse is not touching the head and resumed if muse is on the head,
 * given that one was started before.
 */
UIController.prototype.onTouchingForehead = function(){
    var self = this;
    this.socket.on('notTouchingForehead', function(data){
        if(data.pauseExperiment){//stops boids too
            alert('WARNING: Experiment paused. Muse is not placed on the head');
            self.experimentUIController.pauseExperiment();
        }
    });
    this.socket.on('touchingForehead', function(data){
        if(data.resumeExperiment){
            if(window.confirm('Muse is touching forehead. You may resume the experiment by clicking the play button.')){
               //self.experimentUIController.resumeExperiment();
                self.experimentUIController.setDuration(data.remainingDuration);
            }
        }
    })
};

UIController.prototype.onIsGood = function(){
    var self = this;
    this.socket.on('isGood', function(data){
        self.graphicsController.updateIsGoodIndicator(data.isGood);
    })
};

/***************** BATTERY ***********************/
UIController.prototype.onBatteryUpdate = function(){
    var self = this;
    this.socket.on('batteryUpdate', function(data){
        self.graphicsController.updateBatteryDisplay(data.charge);
    });
};

/***************** HORSESHOE **********************/
//1 = good; 2 = ok; 3 = bad
UIController.prototype.onHorseshoeUpdate = function(){
    var self = this;
    this.socket.on('horseshoe', function(data){
        self.graphicsController.updateHorseshoe(data.horseshoe.slice(1));
    });
};

/***************************** BODY ONLOAD ***************************/

//called body onload
function init(){
    var uiController = new UIController();
}

