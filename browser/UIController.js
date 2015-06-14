/**
 * Created by Stefanie on 10.05.2015.
 */


var COUNTDOWN = undefined;

function UIController(){

    this.museConnected = false;
    this.experimentControllerSet = false;
    this.calibrationFinished = false;
    this.enableControlButtons(false); //disable prev and next experiment mode buttons before calibration is done
    /************************** MAIN AREA ***********************************/
    this.pointsDisplay = $('p.points-display');

    /************************ RED SIDEBAR *************************************/
    //buttons and other inputs red sidebar
    this.newExperimentBtn =  $('button#new-experiment-btn');
    this.saveExperimentBtn = $('button#save-experiment-btn');
    this.startExperimentBtn = $('button#start-mode-btn');
    this.experimentModeRadio = $('input[name="experiment-mode"]');
    this.selectedExperimentModeRadio = $('input[name="experiment-mode"]:checked');

    this.experimentModeDisplay = $('p#experiment-mode-display');
    this.hiddenExperimentModeInput = $('input[name="hidden-experiment-mode"]');
    this.experimentMode = parseInt(this.hiddenExperimentModeInput.val()); //0 - 3
    this.hiddenExperimentDuration = $('input[name="experiment-duration"]');
    this.duration = parseInt(this.hiddenExperimentDuration.val());
    //set text on startExperiment btn
    this.startExperimentBtn.val('Start ' +  $("label[for='"+ this.selectedExperimentModeRadio.attr('id') + "']").text());

    this.ageInput = $('input[name="age"]');
    this.genderRadio = $('input[name="gender"]');
    //dialog with age and gender input
    this.ageGenderDialog = $('#dialog-age-gender').dialog({
        autoOpen: false
    });
    //dialog warning showing when new experiment btn is clicked (with saving option)
    this.saveWarning = $('#dialog-save-warning').dialog({
        autoOpen: false
    });

    /************************ BLUE SIDEBAR **************************************/
    //get selected channel(s) from radio buttons
    this.selectedChannel = $('option[name="ch-picker"]:selected').val();
    this.setSelectedChannelIndices();
    //listen for channel selection changes in UI
    this.onChannelSelection();

    //Frequency band name and idx mapping
    this.frequencyBandNames = ['delta','theta','alpha','beta','gamma'];
    //frequency selection, array of numbers
    //TODO: FIX
    var self = this;
    this.selectedFrequencies = [];
    //this.selectedFrequencies = $('option[name="fr-picker"]:selected').val().map(Number);
    $('option[name="fr-picker"]:selected').each(function(idx, el){
        self.selectedFrequencies.push(parseInt($(el).val()));
    });
    //listen for frequency selection changes in UI
    this.onFrequencySelection();
    //make array with absolute frequency bands. ratios will be calculated later.

    this.frequencyBandsAbs = [];
    $('input[name="fr-dividend"].fr-single').each(function(idx, el){
        self.frequencyBandsAbs.push([0,0,0,0]);
    });
    //set selected frequency band names in Constants
    this.bandNames = [];
    this.selectedFrequencies.forEach(function(idx, el){
        if(el !== -1)
            self.bandNames.push(self.frequencyBandNames[idx]);
        else
            self.bandNames.push('none');
    });


    /******** FREQUENCY PERCENTILE SLIDERS **********/

    this.frequencyPercentileSliders();
    this.firstFreqBandThresh = $('#slider-dividend-percentile').slider("option", "value") / 10 - 1;
    this.secondFreqBandThresh = $('#slider-divisor-percentile').slider("option", "value") / 10 - 1;

    /****************************** GRAPHICS CONTROLLER, CONSTANTS *****************************/

    this.graphicsController = new GraphicsController(this.selectedChannelIndices, this.sele);
    this.constants = this.graphicsController.getConstants();
    this.constants.setFrequencyBands(this.bandNames);

    /************************** SOCKET **********************/
    this.socket = io('http://localhost/');
    this.socket.on('connect', function(){
        self.onTimerUpdate();
        self.onTouchingForehead();
        self.onExperimentCreated();
    });
    //todo. error handling??

    //*********************** LISTENERS for messages from node (nodeIndex or experimentController)
    this.onMuseConnected();
    this.socketRatio(this);
    this.onRatioMaxUpdate(this);
    this.onRatioMinUpdate(this);
    this.averageRatioUpdate(this);
    //this.onFrequencyTresholdUpdate();
    //this.onRawFFTUpdate();
    this.onHorseshoeUpdate();
    this.onBatteryUpdate();

   // this.showCircularCountdown(parseInt($('input[name="experiment-duration"]').val()));

    /**** POINTS RECEIVE & DISPLAY ***/
    this.onPointsUpdate();
    this.points = 0;

    //******************* LISTENERS for ui inputs (browser)
    this.experimentRunning = false;
    this.paused = false;

    this.onNewExperiment();
    this.onSaveExperiment();
    this.onStartModeButtonClick();
    this.onPreviousModeButtonClick();
    this.onNextModeButtonClick();
    this.onStopExperiment();
    this.onExperimentModeSelection();

    //CONTINUE button in warning dialog clicked (after new experiment btn)
    this.onContinueNewExperiment(this);

    /*****FULLSCREEN MODE****/
    this.fullscreen = false;
    this.onFullscreen();
}

UIController.prototype.onExperimentCreated = function(){
    var self = this;
    this.socket.on('experimentCreated', function(data){
        self.experimentControllerSet = data.experimentCreated;
    });
};

/**
 * New experiment btn was clicked.
 * Open dialog to input subject age and gender.
 *
 */
UIController.prototype.onNewExperiment = function(){
    var self = this;
    this.newExperimentBtn.click(function(){
        //open warning dialog
        if(self.museConnected)
            self.saveWarning.dialog('open');
        else
            self.displayMuseNotConnected();
    });
};

/********************************* DIALOG BOX BUTTON LISTENERS *******/

/**
 * Continue btn in new experiment dialog clicked
 * @param self
 */
UIController.prototype.onContinueNewExperiment = function(self){
    $('input[name="ok-new-experiment"]').click(function(){
        self.ageGenderDialog.children(':input[type="radio"]').removeAttr('checked');
        self.ageGenderDialog.children(':input[type="number"]').val('');

        //open dialog for new experiment inputs
        self.ageGenderDialog.dialog('open');
        //TODO: send socket message to reset all data to experimentcontroller after showing warning dialog (with save option)
        self.onAgeGenderSubmit();
        //close warning dialog
        self.saveWarning.dialog('close');

        //new calibration needs to be done
        self.calibrationFinished = false;
        //disable next and prev mode btns until calibration finished
        self.enableControlButtons(false);
    });
};

/**
 * Listen for button submit in dialog box (age gender)
 */
UIController.prototype.onAgeGenderSubmit = function(){
    var self = this;
    var warning = $('#warning');
    $('input[name="age-gender-btn"]').click(function(){
        var selGender = $('input[name="gender"]:checked');
        //inputs selected
        if( self.ageInput.val() !== ''
            && selGender !== []){
            self.socket.emit('newExperiment',
                {   age: parseInt(self.ageInput.val()),
                    gender: selGender.val(),
                    mode: self.experimentMode
                });
            self.ageGenderDialog.dialog('close');
        }//inputs empty
        else{
            if(warning.css('display', 'none')) //show warning
                warning.css('display', 'inline');
        }
    });
};

/*************************** END DIALOG BOX BUTTON LISTENERS ******/

UIController.prototype.onSaveExperiment = function(){
    var self = this;
    this.saveExperimentBtn.click(function(){
        if(self.museConnected && self.experimentControllerSet)
            //TODO: SAVE CSV FILE -> socket message to node
            console.log('SAVE CSV DATA HERE');
        else if(!self.museConnected)
            self.displayMuseNotConnected();
        else if(self.museConnected  && !self.experimentControllerSet)
            self.displayExperimentNotCreated();
    });
    //TODO: save experiment data from json array (node -> experimentController) to csv file with date, time and subject number in name
};


/***
 * Message from node that part of an experiment has finished.
 * The data send via the WebSocket contains the experiment mode idx (0-3) and other data.
 */
UIController.prototype.onStopExperiment = function(){
    var self = this;
    this.socket.on('experimentStopped', function(data){
        if(data.percentiles !== null){
            switch(data.mode){
                case -1: //last experiment mode failed
                    //TODO: add handling for experiment failed
                    break;
                //CALIBRATION finished
                case 0:
                    if(data.error){ //calibration failed
                        alert('Calibration failed! No data received. Please check the electrode contact and recalibrate!');
                        //todo. reset duration
                        console.log('self.duration: ' + self.duration);
                        self.hiddenExperimentDuration.val(self.duration);
                        //set countdown
                        self.setCountdown(self.duration);
                        self.socket.emit('experimentModeChanged', {mode: self.experimentMode, duration: self.duration});
                    }else{
                        self.percentiles = data.percentiles;
                        self.constants.setDividendThreshold(data.percentiles[0][self.firstFreqBandThresh]);
                        self.constants.setDivisorThreshold(data.percentiles[1][self.secondFreqBandThresh]);
                        self.firstFreqBandMin = data.percentiles[0][0];
                        self.secondFreqBandMax = data.percentiles[1][data.percentiles[1].length-1];
                        self.constants.setMinDividendDivisorRatio(self.firstFreqBandMin, self.secondFreqBandMax);
                        self.constants.setMaxDividendDivisorRatio(data.percentiles[0][data.percentiles[0].length-1],data.percentiles[1][0]);
                        console.log('received calibration data');
                        self.showExperimentModeFinished('Calibration');
                        self.calibrationFinished = true; //TODO: ADD ERROR HANDLING IN CASE OF NO RESULTS
                    }
                    break;
                //TEST 1 finished
                case 1:
                    //data.points
                    self.showExperimentModeFinished('First Test');
                    //TODO: save data (points and stuff) and make d3 graph for showing later
                    break;
                //FREE NEUROFEEDBACK finished
                case 2:
                    self.showExperimentModeFinished('Neurofeedback');
                    break;
                //TEST 2 finished
                case 3:
                    self.showExperimentModeFinished('Second Test');
                    break;

            }
            console.log(data.error);
            if(data.error === undefined || !data.error){
                //update experiment mode selection and duration
                self.selectNextMode();
                self.enableControlButtons(true); //enable next and prev buttons
            }
            self.pauseExperiment();
            //stop boids
            $('#running').attr('checked', false);
        }else{ //data.percentiles === null -> no values from muse
            alert('Calibration failed. Please check whether Muse is connected properly.');
        }
        //enable sidebar experiment inputs
        $('.sb-red :input').prop('disabled', false);
    });
};


UIController.prototype.pauseExperiment = function(){ //true = pause, false = unpause
    run(false);
    //change button to play
    this.startExperimentBtn.children('i').attr('class', 'fa fa-play');
    //todo: animation with fotawesome pause icon
    //TODO: show animation when paused + stop timer
    //var icon = '';
   // bool ? icon = $('i.fa.fa-pause') :  icon = $('i.fa.fa-play');
   // $(icon).fadeIn('slow');
};

UIController.prototype.resumeExperiment = function(){
    run(true);
    //change button to pause
    this.startExperimentBtn.children('i').attr('class', 'fa fa-pause');

};

/**** CONTROL PANEL BUTTON LISTENERS ***/
/**
 * Muse is not connected. Show warning.
 */


UIController.prototype.onStartModeButtonClick = function(){
    var self = this;
    this.startExperimentBtn.click(function(){
        if($(this).children('i.fa.fa-play').length !== 0){ //experiment was paused or stopped
            if(self.museConnected && self.experimentControllerSet){
                if(self.experimentMode === 0)
                    self.showExperimentModeStarted("Calibration");
                else if(self.experimentMode === 1)
                    self.showExperimentModeStarted("First Test");
                else if(self.experimentMode === 2)
                    self.showExperimentModeStarted("Free Neurofeedback");
                else if(self.experimentMode === 3)
                    self.showExperimentModeStarted("Second Test");

                //get mode idx from radio btn and send info via socket
                self.socket.emit('startExperimentButton',
                    {mode: self.experimentMode,
                        duration: self.duration,
                        percentiles: [ parseInt(self.firstFreqBandThresh), parseInt(self.secondFreqBandThresh) ],
                        resume: self.paused //if true -> was paused before
                    }
                );
                self.paused = false;
                //set experimentRunning
                self.experimentRunning = true;
                //disable red sidebar inputs
                $('.sb-red :input').prop('disabled', true);
                //reset Points display
                self.resetPoints();
                //TODO: on test 1 start boids dont run, why?
                self.resumeExperiment();//run boids
                self.enableControlButtons(false);
            }else if(!self.museConnected){
                self.displayMuseNotConnected();
            }else if(self.museConnected && !self.experimentControllerSet){
                self.displayExperimentNotCreated();
            }
        } else {//experiment was running and is to be paused
            if(self.experimentMode === 0)
                self.showExperimentModePaused("Calibration");
            else if(self.experimentMode === 1)
                self.showExperimentModePaused("First Test");
            else if(self.experimentMode === 2)
                self.showExperimentModePaused("Free Neurofeedback");
            else if(self.experimentMode === 3)
                self.showExperimentModePaused("Second Test");

            //get mode idx from radio btn and send info via socket
            self.socket.emit('pauseExperimentButton',
                {mode: self.experimentMode}
            );
            self.paused = true;
            $('.sb-red :input').prop('disabled', false);
            self.experimentRunning = false;
            self.pauseExperiment();
            self.enableControlButtons(true);
        }
    });
};

UIController.prototype.onPreviousModeButtonClick = function(){
    var self = this;
    $('button#prev-mode-btn').click(function(){
        if(self.museConnected && self.experimentControllerSet){
            self.experimentMode === 0 ? self.experimentMode = 3: self.experimentMode--;
            self.hiddenExperimentModeInput.val(self.experimentMode);
            switch(self.experimentMode){
                case 0:
                    self.experimentModeDisplay.text('Calibration');
                    self.duration = 10;
                    break;
                case 1:
                    self.experimentModeDisplay.text('Test 1');
                    self.duration = 60;
                    break;
                case 2:
                    self.experimentModeDisplay.text('Neurofeedback');
                    self.duration = 120;
                    break;
                case 3:
                    self.experimentModeDisplay.text('Test 2');
                    self.duration = 60;
                    break;
            }
            self.hiddenExperimentDuration.val(self.duration);
            //set countdown
            self.setCountdown(self.duration);
            self.socket.emit('experimentModeChanged', {mode: self.experimentMode, duration: self.duration});
        }else if(!self.museConnected){
            self.displayMuseNotConnected();
        }else if(self.museConnected && !self.experimentControllerSet){
            self.displayExperimentNotCreated();
        }
    });
};

UIController.prototype.onNextModeButtonClick = function(){
    var self = this;
    $('button#next-mode-btn').click(function(){
        if(self.museConnected && self.experimentControllerSet){
            self.experimentMode === 3 ? self.experimentMode = 0 : self.experimentMode++;
            self.hiddenExperimentModeInput.val(self.experimentMode);
            switch(self.experimentMode){
                case 0:
                    self.experimentModeDisplay.text('Calibration');
                    self.duration = 10;
                    break;
                case 1:
                    self.experimentModeDisplay.text('Test 1');
                    self.duration = 60;
                    break;
                case 2:
                    self.experimentModeDisplay.text('Neurofeedback');
                    self.duration = 120;
                    break;
                case 3:
                    self.experimentModeDisplay.text('Test 2');
                    self.duration = 60;
                    break;
            }
            self.hiddenExperimentDuration.val(self.duration);
            //set countdown
            self.setCountdown(self.duration);
            self.socket.emit('experimentModeChanged', {mode: self.experimentMode, duration: self.duration});
        }else if(!self.museConnected){
            self.displayMuseNotConnected();
        }else if(self.museConnected && !self.experimentControllerSet){
            self.displayExperimentNotCreated();
        }
    });
};

/**
 * Enable or disable next and previous mdoe buttons.
 * @param enable
 */
UIController.prototype.enableControlButtons = function(enable){
    $('#next-mode-btn, #prev-mode-btn').prop('disabled', !enable);
};
/***** END CONTROL PANEL BUTTON LISTENERS ****/

/**
 * Update points display in main area (left corner of svg field with boids)
 */
UIController.prototype.onPointsUpdate = function(){
    var self = this;
    //TODO: display points as they are earned near the boids
    this.socket.on('updatePoints', function(data){
        console.log('Points update received:' + data.points);
        self.points += data.points;
        self.pointsDisplay.text(self.points);
    });
};

UIController.prototype.resetPoints = function(){
    this.points = 0;
    this.pointsDisplay.text(this.points);
};

/**
 * Experiment mode selection changed in red sidebar (radio btns)
 */
UIController.prototype.onExperimentModeSelection = function(){
    var self = this;
    this.experimentModeRadio.change(function(){
        self.selectedExperimentModeRadio = $(this);
        self.experimentMode = parseInt($(this).val());
        var duration = parseInt(($(this).attr('data-duration')));
        $('input[name="experiment-duration"]').val(duration);//set duration in input field
        //send mode and druation to experimentController
        self.socket.emit('modeDurationUpdate', {mode: self.experimentMode, duration: duration});
        //change text on startExperiment btn
        self.startExperimentBtn.val('Start ' +  $("label[for='"+ $(this).attr('id') + "']").text());
        //set countdown for experiment mode
        self.setCountdown(duration);
    });
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

/**
 * Display text when experiment mode stops.
 * @param expMode
 */
UIController.prototype.showExperimentModeFinished = function(expMode){
    var boidSVG = this.graphicsController.getBoidSVG();
    var text = boidSVG.append('text')
        .attr({ 'x': boidSVG.attr('width')/2-60,
            'y': boidSVG.attr('height')/2-15,
            'fill': 'cadetblue',
            'font-size': '2.5em'})
        .text(expMode + ' Finished');
    setTimeout(function(){
        text.remove();
    }, 2000)
};
/**
 * Display text when experiment mode starts.
 * @param expMode
 */
UIController.prototype.showExperimentModeStarted = function(expMode){
    if(this.museConnected && this.experimentControllerSet){
        var boidSVG = this.graphicsController.getBoidSVG();
        var text = boidSVG.append('text')
            .attr({ 'x': boidSVG.attr('width')/2-60,
                'y': boidSVG.attr('height')/2-15,
                'fill': 'cadetblue',
                'font-size': '3em'})
            .text(expMode + ' Started');
        setTimeout(function(){
            text.remove();
        }, 2000)
    }
};
/**
 * Display text when experiment mode starts.
 * @param expMode
 */
UIController.prototype.showExperimentModePaused = function(expMode){
    if(this.museConnected && this.experimentControllerSet){
        var boidSVG = this.graphicsController.getBoidSVG();
        var text = boidSVG.append('text')
            .attr({ 'x': boidSVG.attr('width')/2-60,
                'y': boidSVG.attr('height')/2-15,
                'fill': 'cadetblue',
                'font-size': '3em'})
            .text(expMode + ' Paused');
        setTimeout(function(){
            text.remove();
        }, 2000)
    }
};

/**
 * Automatically select next experiment mode and set experiment duration.
 */
//TODO: DELETE??
UIController.prototype.selectNextMode = function(){
    //"click" on nextmode btn
    $('button#next-mode-btn').click();
};


/******************************************* RATIO UPDATES ********************************/
//gets frequency ratio updates from node.js via websocket
UIController.prototype.socketRatio = function(self){
    this.socket.on('ratio', function(data){
        self.constants.setRatio(data.ratio);
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
        self.setMuseConnected(data.museConnected);
        self.experimentControllerSet = data.experimentControllerSet;
    });
};

UIController.prototype.setMuseConnected = function(bool){
    this.museConnected = bool;
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
            self.pauseExperiment();
        }
    });
    this.socket.on('touchingForehead', function(data){
        if(data.resumeExperiment){
            alert('Muse is touching forehead. Resuming experiment.');
            self.resumeExperiment();
        }
    })
};

/***********************************    CHANNEL AND FREQUENCY BAND SELECTION *******************/
UIController.prototype.frequencyPercentileSliders = function(){
    var self = this;
    $('#slider-dividend-percentile').slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: 100,
        step: 10,
        value: 50,
        slide: function( event, ui ) {
            $( "#amount-dividend" ).html( ui.value + '&#37;' );
            self.onSlide(ui, true);
        }
    });
    $('#slider-divisor-percentile').slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: 100,
        step: 10,
        value: 50,
        slide: function( event, ui ) {
            $( "#amount-divisor" ).html( ui.value + '&#37;' );
            self.onSlide(ui, false);
        }
    });
};

UIController.prototype.onSlide = function(ui, isDividend){
    if(this.percentiles !== undefined){
        if(isDividend){
            this.firstFreqBandThresh = ui.value / 10 - 1;
            this.constants.setDividendThreshold(this.percentiles[0][this.firstFreqBandThresh]);
        }else{
            this.secondFreqBandThresh = ui.value / 10 - 1;
            this.constants.setDivisorThreshold(this.percentiles[1][this.secondFreqBandThresh]);
        }
    }
};

UIController.prototype.onFrequencySelection = function(){
    var self = this;
    $('select.frequency-picker').change(function()
    {
        if($(this).attr('id') === 'select-fr-dividend')
        {
            self.selectedFrequencies[0] = parseInt($(this).val());
            //enable old selection and disable new selection in divisor options (inhibit select field)
            $('option[name="fr-picker"]:disabled').attr('disabled', false);
            $('option[value=' + $(this).val() + '].fr-divisor').attr('disabled', true);
        }
        else if($(this).attr('id') === 'select-fr-divisor')
        {
            self.selectedFrequencies[1] = parseInt($(this).val());
        }

        //send frequency selection to node.js over websocket
        self.socket.emit('frequencyBandSelection', { selectedFrequencyBands: self.selectedFrequencies });

        //if boid animation is running, uncheck
        if(running()){
            run(false);
        }
        self.graphicsController.setSelectedFreqIndices(self.selectedFrequencies);
        self.graphicsController.resetBoids(self.graphicsController);

        self.bandNames = [];
        //update selected frequency band names
        self.selectedFrequencies.forEach(function(idx, el){
            if(el !== -1)
                self.bandNames.push(self.frequencyBandNames[idx]);
            else
                self.bandNames.push('none');
        });
        d3.select('#perc1-label').text('%-ile ' + self.bandNames[0]);
        d3.select('#perc2-label').text('%-ile ' + self.bandNames[1]);
        //TODO: get updated calibration values
    });
};

UIController.prototype.onChannelSelection = function(){
    var self = this;
    $('select.channel-picker').change(function(){
        self.selectedChannel = $(this).val();
        self.setSelectedChannelIndices();
        //send channel selection to node.js over websocket
        self.socket.emit('channelSelection', { selectedChannels: self.selectedChannelIndices });
        //if running, uncheck
        if(running()){
            run(false);
        }
        self.graphicsController.setSelectedChannelIndices(self.selectedChannelIndices);
        self.graphicsController.resetBoids(self.graphicsController);
    });
};

UIController.prototype.setSelectedChannelIndices = function(){
    //one channel => return array with one number
    if(this.selectedChannel.length === 1){
        this.selectedChannelIndices = [parseInt(this.selectedChannel)];
    }//two channels => return array of numbers
    else{
        if(this.selectedChannel === 'all'){
            this.selectedChannelIndices = this.selectedChannel.split(',').map(Number);
        }else{
            if(this.selectedChannel.indexOf('vs') !== -1)
                this.selectedChannel = this.selectedChannel.split('-vs').join('');
            this.selectedChannelIndices = this.selectedChannel.split('-').map(Number);
        }
    }
};

/******************** FULLSCREEN ******************/
UIController.prototype.onFullscreen = function(){
    var self = this;
    $('button#expand-btn').click(function(){
        if(!self.fullscreen){
            window.open("", "_self", "");
           // window.close();
            window.open("file:///E:/Programmieren/Node.js/node_modules/test-module/index.html", "page", "toolbars=no,location=no,resizable=no");
            //TODO: anstatt selbes fenster nochmal öffnen -> neues fenster mit index_trainer.html -> enthält Einstellungen für Freuenzbänder, Kanalauswahl
            // , Artefaktanzeige, EEG-Anzeige pro Kanal
        }
    });
};

/***************** BATTERY ***********************/
UIController.prototype.onBatteryUpdate = function(){
    var self = this;
    this.socket.on('batteryUpdate', function(data){
        self.updateBatteryDisplay(data.charge);
    });
};

UIController.prototype.updateBatteryDisplay = function(charge){
    this.graphicsController.updateBatteryDisplay(charge);
};

/***************** HORSESHOE **********************/
UIController.prototype.onHorseshoeUpdate = function(){
    var self = this;
    this.socket.on('horseshoe', function(data){
        self.updateHorseshoe(data.horseshoe);
    });
};

//1 = good; 2 = ok; 3 = bad
UIController.prototype.updateHorseshoe = function(data){
    this.graphicsController.updateHorseshoe(data.slice(1));
};

/****************** WARNING ALERTS ******************/
UIController.prototype.displayMuseNotConnected = function(){
    alert('WARNING: Muse is not connected! Please connect it and retry.');
};

UIController.prototype.displayExperimentNotCreated = function(){
    alert('WARNING: No experiment was created! Create one and retry.');
};

/****************** UNUSED ATM *******************/
//index 1 of data.osc is concentration / mellow value (0 if muse is off head)
UIController.prototype.setConcentration = function(data){
    //console.log("concentration: " + data.osc[1]);
    this.constants.setConcentration(data.osc[1]);
};

UIController.prototype.setMellow = function(data){
    //console.log("mellow: " + data.osc[1]);
    this.constants.setMellow(data.osc[1]);
};



/**
 * Listen for raw fft, update bargraph
 */
/*
 UIController.prototype.onRawFFTUpdate = function(){
 var self = this;
 this.socket.on('raw_fft0', 'raw_fft1', 'raw_fft2', 'raw_fft3',  function(){
 self.graphicsController.update_fft_data(data);
 self.graphicsController.update_bargraph(data);
 });
 };*/


/***************************** BODY ONLOAD ***************************/

//called body onload
function init(){
    var uiController = new UIController();
}

