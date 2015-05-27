/**
 * Created by Stefanie on 10.05.2015.
 */

//TODO: experiment modes from sidebar

function UIController(){
    /************************** MAIN AREA ***********************************/
    this.pointsDisplay = $('p.points-display');

    /************************ RED SIDEBAR *************************************/
    //buttons and other inputs red sidebar
    this.newExperimentBtn =  $('input[name="new-experiment"]');
    this.startExperimentBtn = $('input[name="start-experiment"]');
    this.experimentModeRadio = $('input[name="experiment-mode"]');
    this.selectedExperimentModeRadio = $('input[name="experiment-mode"]:checked');
    this.experimentMode = parseInt(this.selectedExperimentModeRadio.val()); //0 - 3
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
    this.selectedFrequencies = $('option[name="fr-picker"]:selected').val().split(',').map(Number);
    //listen for frequency selection changes in UI
    this.onFrequencySelection();
    //make array with absolute frequency bands. ratios will be calculated later.
    var self = this;
    this.frequencyBandsAbs = [];
    $('input[name="fr-picker"].fr-single').each(function(idx, el){
        self.frequencyBandsAbs.push([0,0,0,0]);
    });
    //set selected frequency band names in Constants
    this.bandNames = [];
    this.selectedFrequencies.forEach(function(el){
        self.bandNames.push(self.frequencyBandNames[el]);
    });

    //Frequency band ratio slider setup and listen for changes
    this.firstFreqBandThresh = ($('input[name="freq-band-1-percentile"]').val() / 10) -1;

    this.secondFreqBandThresh = ($('input[name="freq-band-2-percentile"]').val() / 10) -1;

    /****************************** GRAPHICS CONTROLLER, CONSTANTS *****************************/

    this.graphicsController = new GraphicsController(this.selectedChannelIndices, this.sele);
    this.constants = this.graphicsController.getConstants();
    this.constants.setFrequencyBands(this.bandNames);

    /************************** SOCKET **********************/
    this.socket = io('http://localhost/');

    //*********************** LISTENERS for messages from node (nodeIndex or experimentController)
    this.socketRatio(this);
    this.onRatioMaxUpdate(this);
    this.onRatioMinUpdate(this);
    this.averageRatioUpdate(this);
    this.onFrequencyTresholdUpdate();
    this.onRawFFTUpdate();
    this.onHorseshoeUpdate();
    this.onPointsUpdate();

    //******************* LISTENERS for ui inputs (browser)
    this.experimentRunning = false;
    this.onNewExperiment();
    //CONTINUE button in warning dialog clicked (after new experiment btn)
    this.onContinueNewExperiment(this);
    //SAVE button in warning dialog clicked (after new experiment btn)
    //TODO: save experiment as csv (in experimentController ->socket message)
    this.onStartExperiment();
    this.onStopExperiment();
    this.onExperimentModeSelection();
}

/**
 * Update points display in main area (left corner of svg field with boids)
 */
UIController.prototype.onPointsUpdate = function(){
    var self = this;
    //TODO: display points as they are earned near the boids
    this.socket.on('updatePoints', function(data){
        console.log('Points update received:' + data.points);
        self.pointsDisplay.text(data.points);
    });
};

/**
 * Experiment mode selection changed in red sidebar (radio btns)
 */
UIController.prototype.onExperimentModeSelection = function(){
    var self = this;
    this.experimentModeRadio.change(function(){
        self.experimentMode = parseInt($(this).val());
        //send mode to experimentController
        self.socket.emit('modeSelection', {mode: self.experimentMode});
        //change text on startExperiment btn
        self.startExperimentBtn.val('Start ' +  $("label[for='"+ $(this).attr('id') + "']").text());
    });
};

/**
 * New experiment btn was clicked.
 * Open dialog to input subject age and gender.
 *
 */
UIController.prototype.onNewExperiment = function(){
    //TODO: TEST
    var self = this;
    this.newExperimentBtn.click(function(){
        //open warning dialog
        self.saveWarning.dialog('open');
    });
};

UIController.prototype.onContinueNewExperiment = function(self){
    $('input[name="ok-new-experiment"]').click(function(){
        //TODO: delete input field contents
        self.ageGenderDialog.children(':input[type="radio"]').removeAttr('checked');
        self.ageGenderDialog.children(':input[type="number"]').val('');

        //open dialog for new experiment inputs
        self.ageGenderDialog.dialog('open');
        //TODO: send socket message to reset all data to experimentcontroller after showing warning dialog (with save option)
        self.onAgeGenderSubmit();
        //close warning dialog
        self.saveWarning.dialog('close');
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

/**
 * Start experiment btn was clicked.
 */
UIController.prototype.onStartExperiment = function(){
    var self = this;
    this.startExperimentBtn.click(function(){
        //get mode idx from radio btn and send info via socket
        self.socket.emit('startExperimentButton',
            {mode: parseInt($('input[name="experiment-mode"]:checked').val()),
             duration: parseInt($('input[name="experiment-duration"]').val()),
             percentiles: [ parseInt(self.firstFreqBandThresh), parseInt(self.secondFreqBandThresh) ]}
        );
        self.experimentRunning = true;
        $('.sb-red :input').prop('disabled', true);
    });
};

/***
 * Message from node that part of an experiment has finished.
 * The data send via the WebSocket contains the experiment mode idx (0-3) and other data.
 */
UIController.prototype.onStopExperiment = function(){
    var self = this;
    this.socket.on('experimentStopped', function(data){
        switch(data.mode){
            //CALIBRATION finished
            case 0:
                self.percentiles = data.percentiles;
                self.constants.setDividendThreshold(data.percentiles[0][self.firstFreqBandThresh]);
                self.constants.setDivisorThreshold(data.percentiles[1][self.secondFreqBandThresh]);
                self.firstFreqBandMin = data.percentiles[0][0];
                self.secondFreqBandMax = data.percentiles[1][data.percentiles[1].length-1];
                self.constants.setMinDividendDivisorRatio(self.firstFreqBandMin, self.secondFreqBandMax);
                self.constants.setMaxDividendDivisorRatio(data.percentiles[0][data.percentiles[0].length-1],data.percentiles[1][0]);
                console.log('received calibration data');
                //enable sidebar experiment inputs
               // $('.sb-red :input').prop('disabled', false);
                break;
            //TEST 1 finished
            case 1:
                //data.points
                //TODO: add experiment stopped sign somewhere
                break;
            //FREE NEUROFEEDBACK finished
            case 2:

                break;
            //TEST 2 finished
            case 3:

                break;
        }
        //TODO: test
        //enable sidebar experiment inputs
        $('.sb-red :input').prop('disabled', false);
    });
};

UIController.prototype.onSaveExperiment = function(){
    //TODO: save experiment data from json array (node -> experimentController) to csv file with date, time and subject number in name
};

UIController.prototype.onFrequencyTresholdUpdate = function(){
    var self = this;
    //frequency band sliders
    $('input[name="perc1-update"]').click(function(){
        self.firstFreqBandThresh = ($('input[name="freq-band-1-percentile"]').val() / 10) -1;
        self.constants.setDividendThreshold(self.percentiles[0][self.firstFreqBandThresh]);
    });
    $('input[name="perc2-update"]').click(function(){
        self.secondFreqBandThresh = ($('input[name="freq-band-2-percentile"]').val() / 10) -1;
        self.constants.setDivisorThreshold(self.percentiles[1][self.secondFreqBandThresh]);
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
            $('#running').attr('checked', false);
        }
        self.graphicsController.setSelectedChannelIndices(self.selectedChannelIndices);
        self.graphicsController.resetBoids(self.graphicsController);
    });
};

UIController.prototype.onFrequencySelection = function(){
    var self = this;
    $('select.frequency-picker').change(function(){
        //always an array
        self.selectedFrequencies = $(this).val().split(',').map(Number);
        //send frequency selection to node.js over websocket
        self.socket.emit('frequencyBandSelection', { selectedFrequencyBands: self.selectedFrequencies });

        //if boid animation is running, uncheck
        if(running()){
            $('#running').attr('checked', false);
        }
        self.graphicsController.setSelectedFreqIndices(self.selectedFrequencies);
       // self.graphicsController.setSelectedChannelIndices(self.selectedChannelIndices);
        self.graphicsController.resetBoids(self.graphicsController);

        self.bandNames = [];
        //update selected frequency band names
        self.selectedFrequencies.forEach(function(el){
            self.bandNames.push(self.frequencyBandNames[el]);
        });
        d3.select('#perc1-label').text('%-ile ' + self.bandNames[0]);
        d3.select('#perc2-label').text('%-ile ' + self.bandNames[1]);
        //TODO: get updated calibration values

    });
};

/**
 * Listen for raw fft, update bargraph
 */
UIController.prototype.onRawFFTUpdate = function(){
    var self = this;
    this.socket.on('raw_fft0', /*'raw_fft1', 'raw_fft2', 'raw_fft3', */ function(){
        self.graphicsController.update_fft_data(data);
        self.graphicsController.update_bargraph(data);
    });
};

UIController.prototype.onHorseshoeUpdate = function(){
    var self = this;
    this.socket.on('horseshoe', function(data){
        self.setHorseshoe(data.horseshoe);
    });
};

//gets frequency ratio updates from node.js via websocket
UIController.prototype.socketRatio = function(self){
    this.socket.on('ratio', function(data){
        //TODO: maybe set ratio frequency band names here as well
        self.constants.setRatio(data.ratio);
       // console.log(data.ratio[0] + ':\t' + data.ratio[1] );
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

//1 = good; 2 = ok; 3 = bad
UIController.prototype.setHorseshoe = function(data){
    this.graphicsController.updateHorseshoe(data.slice(1));
};

/***** DRAWING BOIDS *****/

UIController.prototype.onBoidsUpdate = function(self){
    this.socket.on('boidsUpdate',
        function(data){
            self.graphicsController.drawBoids(data);
        }
    );
};

/***** END DRAWING BOIDS *****/

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


//index 1 of data.osc is concentration / mellow value (0 if muse is off head)
UIController.prototype.setConcentration = function(data){
    //console.log("concentration: " + data.osc[1]);
    this.constants.setConcentration(data.osc[1]);
};

UIController.prototype.setMellow = function(data){
    //console.log("mellow: " + data.osc[1]);
    this.constants.setMellow(data.osc[1]);
};

//called body onload
function init(){
    var mainController = new UIController();
}

/**
 *  Enable or disable UI Elements by passing them to this function with a boolean specifying
 *  whether to enable or disable them.
 *
 * @param inputSelector{selector}
 * @param disable{boolean}
 */
UIController.prototype.disableInputs = function(inputSelector, disable){
    $(inputSelector).prop('disabled', disable);
    disable ?
        $(inputSelector).parents('ul').css('color','lightgrey') :
        $(inputSelector).parents('ul').css('color','black');
};
