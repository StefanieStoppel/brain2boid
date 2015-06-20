/**
 * Created by Stefanie on 15.06.2015.
 */
var bandnames = ['delta','theta','alpha','beta','gamma'];
function ExperimentUIController(constants, graphicsController, socket, uiController){
    this.constants = constants;
    this.graphicsController = graphicsController;
    this.socket = socket;
    this.socketConnected = false;
    this.uiController = uiController;

    /********************************* CONNECTION & CALIBRATION VARIABLES ********************************/
    this.museConnected = false;
    this.experimentControllerExists = false;
    this.calibrationFinished = false;
    this.enableControlButtons(false); //disable prev and next experiment mode buttons before calibration is done


    this.percentiles = [];
    //TODO: IST DAS ÜBERHAUPT SINNVOLLL????????
    this.selectedFrequencyIndices = [];
    this.selectedFrequencyIndices[0] = parseInt($('select.frequency-picker').children('option.fr-dividend:selected').val());
    this.selectedFrequencyIndices[1] = parseInt($('select.frequency-picker').children('option.fr-divisor:selected').val());
    //TODO: FIX
    this.selectedChannelIndices = [];

    this.experimentMode = parseInt($('input[name="hidden-experiment-mode"]').val()); //0 - 3
    this.duration = parseInt($('input[name="experiment-duration"]').val());
    this.trainingRatio = 0.5;

    this.onSocketConnection();
    this.init();

}

ExperimentUIController.prototype.init = function(){
    /************************ DIALOG *********************************************/
    //dialog with age and gender input
    this.ageGenderDialog = $('#dialog-age-gender').dialog({
        autoOpen: false
    });
    //dialog warning showing when new experiment btn is clicked (with saving option)
    this.saveWarning = $('#dialog-save-warning').dialog({
        autoOpen: false
    });

    /************************ BLUE SIDEBAR **************************************/
    //Frequency band name and idx mapping
    this.frequencyBandNames = ['delta','theta','alpha','beta','gamma'];
    //get selected channel(s) from select options
    this.setSelectedChannelIndices($('option[name="ch-picker"]:selected').val());
    //make channels that are not selected opaque
    this.setHorseshoeChannelOpaque();
    //listen for channel selection changes in UI
    this.onChannelSelection();
    //listen for frequency selection changes in UI
    this.onFrequencySelection();

    /********************************* DUAL MONITOR MODE *************************/
    this.fullscreen = false;
    this.onFullscreen();


    /******************** VARIABLES FOR EXPERIMENT STATE ***********************/
    this.experimentRunning = false;
    this.paused = false;

    //******************* LISTENERS for ui inputs (browser)
    this.onNewExperimentButtonClick();
    this.onSaveExperimentButtonClick();
    this.onStartModeButtonClick();
    this.onPreviousModeButtonClick();
    this.onNextModeButtonClick();
    this.onStopExperiment();

    //CONTINUE button in warning dialog clicked (after new experiment btn)
    this.onContinueNewExperimentButtonClick(this);

    //Ratio bar graph in sidebar
    this.initRewardBarGraph();
    //artfact bar graphs in sidebar
    this.initArtifactBarGraphs();


    /******** FREQUENCY PERCENTILE SLIDERS **********/
    this.frequencyPercentileSliders();
    //disable sidebar settings and sliders until socket connected
    this.enableSidebarSettings(false);
    this.rewardIdx  = $('#slider-dividend-percentile').slider("option", "value") / 10 - 1;
    this.inhibitIdx = $('#slider-divisor-percentile').slider("option", "value") / 10 - 1;
};

ExperimentUIController.prototype.onSocketConnection = function(){
    var self = this;
    this.socket.on('connect', function(){
        self.onExperimentCreated();
        self.socketConnected = true;//todo: change in case of lost connecction
        self.enableSidebarSettings(true);

        //artifact listeners
        self.onJawClenchUpdate();
        self.onBlinkUpdate();
        //get updates of band power percentiles (when frequency or channel selection changes)
        self.onPercentileUpdate();
    });
};

/**************************************************************************************************/
/********************************* EXPERIMENT FUNCTIONS *******************************************/
/**************************************************************************************************/

ExperimentUIController.prototype.onExperimentCreated = function(){
    var self = this;
    this.socket.on('experimentCreated', function(data){
        self.experimentControllerExists = data.experimentCreated;//TODO: variable
    });
};

/**
 * New experiment btn was clicked.
 * Open dialog to input subject age and gender.
 *
 */
ExperimentUIController.prototype.onNewExperimentButtonClick = function(){
    var self = this;
    $('button#new-experiment-btn').click(function(){
        //open warning dialog
        if(self.museConnected)
            self.saveWarning.dialog('open');
        else
            self.displayMuseNotConnected();
    });
};

/********************************* DIALOG BOX BUTTON LISTENERS ********************************/

/**
 * Continue btn in new experiment dialog clicked
 * @param self
 */
ExperimentUIController.prototype.onContinueNewExperimentButtonClick = function(self){
    $('input[name="ok-new-experiment"]').click(function(){
        self.ageGenderDialog.children(':input[type="radio"]').removeAttr('checked');
        self.ageGenderDialog.children(':input[type="number"]').val('');

        //open dialog for new experiment inputs
        self.ageGenderDialog.dialog('open');
        //TODO: send socket message to reset all data to experimentcontroller after showing warning dialog (with save option)
        self.onAgeGenderSubmitButtonClick();
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
ExperimentUIController.prototype.onAgeGenderSubmitButtonClick = function(){
    var self = this;
    var warning = $('#warning');
    $('input[name="age-gender-btn"]').click(function()
    {
        var gender = $('input[name="gender"]:checked');
        var age = $('input[name="age"]').val();

        if( age !== '' && gender !== [])
        {
            self.socket.emit('newExperiment',
                {   age: parseInt(age),
                    gender: gender.val(),
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

ExperimentUIController.prototype.onSaveExperimentButtonClick = function(){
    var self = this;
    $('button#save-experiment-btn').click(function(){
        if(self.museConnected && self.experimentControllerExists)
        //TODO: SAVE CSV FILE -> socket message to node
            console.log('SAVE CSV DATA HERE');
        else if(!self.museConnected)
            self.displayMuseNotConnected();
        else if(self.museConnected  && !self.experimentControllerExists)
            self.displayExperimentNotCreated();
    });
    //TODO: save experiment data from json array (node -> experimentController) to csv file with date, time and subject number in name
};


/***
 * Message from node that part of an experiment has finished.
 * The data send via the WebSocket contains the experiment mode idx (0-3) and other data.
 */
ExperimentUIController.prototype.onStopExperiment = function(){
    var self = this;
    this.socket.on('experimentStopped', function(data){
        self.automaticallyStopExperiment(data);
    });
};

ExperimentUIController.prototype.automaticallyStopExperiment = function(data){
    var self = this;
    if(data.percentiles !== null){
        switch(data.mode){
            case -1: //last experiment mode failed
                //TODO: add handling for experiment failed
                break;
            //CALIBRATION finished
            case 0:
                if(data.error){ //calibration failed
                    console.log(data.error);
                    alert('Calibration failed! No data received. Please check the electrode contact and recalibrate!');
                    console.log('self.duration: ' + self.duration);
                    $('input[name="experiment-duration"]').val(self.duration);
                    //set countdown
                    self.uiController.setCountdown(self.duration);
                    self.socket.emit('experimentModeChanged', {mode: self.experimentMode, duration: self.duration});
                }else{
                    self.updatePercentiles(data.percentiles);

                    console.log('received calibration data');
                    self.displayExperimentModeState('Calibration', 'Finished');
                    self.calibrationFinished = true; //TODO: ADD ERROR HANDLING IN CASE OF NO RESULTS
                }
                break;
            //TEST 1 finished
            case 1:
                //data.points
                self.displayExperimentModeState('First Test', 'Finished');
                //TODO: save data (points and stuff) and make d3 graph for showing later
                break;
            //FREE NEUROFEEDBACK finished
            case 2:
                self.displayExperimentModeState('Neurofeedback', 'Finished');
                break;
            //TEST 2 finished
            case 3:
                self.displayExperimentModeState('Second Test', 'Finished');
                break;

        }
        if(data.error === undefined || !data.error){
            //update experiment mode selection and duration
            self.selectNextMode();
            self.enableControlButtons(true); //enable next and prev buttons
            self.enableSidebarSettings(true);
        }
        //show control bar
        $('div#controls').opacityControlBar(200, 1);

        self.pauseExperiment();
        self.experimentRunning = false;
    }else{ //data.percentiles === null -> no values from muse
        alert('Calibration failed. Please check whether Muse is connected properly.');
    }
    //enable sidebar experiment inputs
    $('.sb-red :input').prop('disabled', false);
};

ExperimentUIController.prototype.getExperimentPaused = function(){
    return this.paused;
};

ExperimentUIController.prototype.getExperimentRunning = function(){
    return this.experimentRunning;
};

ExperimentUIController.prototype.pauseExperiment = function(){ //true = pause, false = unpause
    run(false);
    //change button to play
    $('button#start-mode-btn').children('i').attr('class', 'fa fa-play');
};

ExperimentUIController.prototype.resumeExperiment = function(){
    run(true);
    //change button to pause
    $('button#start-mode-btn').children('i').attr('class', 'fa fa-pause');
};

/**** CONTROL PANEL BUTTON LISTENERS ***/

ExperimentUIController.prototype.onStartModeButtonClick = function(){
    var self = this;
    $('button#start-mode-btn').click(function(){
        if($(this).children('i.fa.fa-play').length !== 0){ //experiment was paused or stopped
            if(self.museConnected && self.experimentControllerExists){
                if(self.experimentMode === 0)
                    self.displayExperimentModeState('Calibration','Started');
                else if(self.experimentMode === 1)
                    self.displayExperimentModeState('First Test','Started');
                else if(self.experimentMode === 2)
                    self.displayExperimentModeState('Neurofeedback', 'Started');
                else if(self.experimentMode === 3)
                    self.displayExperimentModeState('Second Test', 'Started');

                //get mode idx from radio btn and send info via socket
                self.socket.emit('startExperimentButton',
                    {mode: self.experimentMode,
                        duration: self.duration,
                        percentiles: [ parseInt(self.rewardIdx), parseInt(self.inhibitIdx) ],
                        resume: self.paused //if true -> was paused before
                    }
                );
                if(!self.paused){//delete points if experiment mode was not paused
                    //reset Points display
                    self.uiController.resetPoints();
                }
                self.paused = false;
                //set experimentRunning
                self.experimentRunning = true;
                //disable red sidebar inputs
                $('.sb-red :input').prop('disabled', true);
                //TODO: hier mehr sachen reinpacken, die immer ausgeführt werden sollen, wenn experiment resumed wird
                self.resumeExperiment();//run boids
                //disable controls and sidebar settings
                self.enableControlButtons(false);
                self.enableSidebarSettings(false);
            }else if(!self.museConnected){
                self.displayMuseNotConnected();
            }else if(self.museConnected && !self.experimentControllerExists){
                self.displayExperimentNotCreated();
            }
        } else {//experiment was running and is to be paused
            if(self.experimentMode === 0)
                self.displayExperimentModeState('Calibration', 'Paused');
            else if(self.experimentMode === 1)
                self.displayExperimentModeState('First Test', 'Paused');
            else if(self.experimentMode === 2)
                self.displayExperimentModeState('Neurofeedback', 'Paused');
            else if(self.experimentMode === 3)
                self.displayExperimentModeState('Second Test', 'Paused');

            //get mode idx from radio btn and send info via socket
            self.socket.emit('pauseExperimentButton',
                {mode: self.experimentMode}
            );
            self.paused = true;
            $('.sb-red :input').prop('disabled', false);
            self.experimentRunning = false;
            self.pauseExperiment();
            //self.enableControlButtons(true);
        }
    });
};

ExperimentUIController.prototype.updateExperimentModeDisplayAndDuration = function(text, duration){
    $('p#experiment-mode-display').text(text);
    this.duration = duration;
    $('input[name="experiment-duration"]').val(duration);
};

ExperimentUIController.prototype.onPreviousModeButtonClick = function(){
    var self = this;
    $('button#prev-mode-btn').click(function(){
        if(self.museConnected && self.experimentControllerExists){
            self.experimentMode === 0 ? self.experimentMode = 3: self.experimentMode--;
            $('input[name="hidden-experiment-mode"]').val(self.experimentMode);
            switch(self.experimentMode){
                case 0:
                    self.updateExperimentModeDisplayAndDuration('Calibration', 10);
                    break;
                case 1:
                    self.updateExperimentModeDisplayAndDuration('Test 1', 60);
                    break;
                case 2:
                    self.updateExperimentModeDisplayAndDuration('Neurofeedback', 120);
                    break;
                case 3:
                    self.updateExperimentModeDisplayAndDuration('Test 2', 60);
                    break;
            }
            //set countdown
            self.uiController.setCountdown(self.duration);
            self.socket.emit('experimentModeChanged', {mode: self.experimentMode, duration: self.duration});
        }else if(!self.museConnected){
            self.displayMuseNotConnected();
        }else if(self.museConnected && !self.experimentControllerExists){
            self.displayExperimentNotCreated();
        }
    });
};

/**
 * Automatically select next experiment mode and set experiment duration.
 */
ExperimentUIController.prototype.selectNextMode = function(){
    //"click" on nextmode btn
    $('button#next-mode-btn').click();
};

ExperimentUIController.prototype.onNextModeButtonClick = function(){
    var self = this;
    $('button#next-mode-btn').click(function(){
        if(self.museConnected && self.experimentControllerExists){
            self.experimentMode === 3 ? self.experimentMode = 0 : self.experimentMode++;
            $('input[name="hidden-experiment-mode"]').val(self.experimentMode);
            switch(self.experimentMode){
                case 0:
                    self.updateExperimentModeDisplayAndDuration('Calibration', 10);
                    break;
                case 1:
                    self.updateExperimentModeDisplayAndDuration('Test 1', 60);
                    break;
                case 2:
                    self.updateExperimentModeDisplayAndDuration('Neurofeedback', 120);
                    break;
                case 3:
                    self.updateExperimentModeDisplayAndDuration('Test 2', 60);
                    break;
            }
            //set countdown
            self.uiController.setCountdown(self.duration);
            self.socket.emit('experimentModeChanged', {mode: self.experimentMode, duration: self.duration});
        }else if(!self.museConnected){
            self.displayMuseNotConnected();
        }else if(self.museConnected && !self.experimentControllerExists){
            self.displayExperimentNotCreated();
        }
    });
};

/**
 * Enable or disable next and previous mdoe buttons.
 * @param enable
 */
ExperimentUIController.prototype.enableControlButtons = function(enable){
    $('#next-mode-btn, #prev-mode-btn').prop('disabled', !enable);
};

/***
 * Display message on SVG field when experiment is started, paused or stopped.
 * @param mode
 * @param state
 */
ExperimentUIController.prototype.displayExperimentModeState = function(mode, state){
    var boidSVG = this.graphicsController.getBoidSVG();
    var text = boidSVG.append('text')
        .attr({ 'x': boidSVG.attr('width')/2-60,
            'y': boidSVG.attr('height')/2-15,
            'fill': 'cadetblue',
            'font-size': '2.5em'})
        .text(mode + ' ' + state);
    setTimeout(function(){
        text.remove();
    }, 2000)
};


/**************************************************************************************************/
/************************************** SIDEBAR FUNCTIONS *****************************************/
/**************************************************************************************************/

/***********************************  CHANNEL AND FREQUENCY BAND SELECTION *******************/


//Frequency bands for reward and inhibit have been selected
ExperimentUIController.prototype.onFrequencySelection = function(){
    var self = this;
    $('select.frequency-picker').change(function()
    {
        if($(this).attr('id') === 'select-fr-dividend')
        {
            self.selectedFrequencyIndices[0] = parseInt($(this).val());
            //enable old selection and disable new selection in divisor options (inhibit select field)
            $('option[name="fr-picker"]:disabled').attr('disabled', false);
            $('option[value=' + $(this).val() + '].fr-divisor').attr('disabled', true);
        }
        else if($(this).attr('id') === 'select-fr-divisor')
        {
            self.selectedFrequencyIndices[1] = parseInt($(this).val());
        }

        //send frequency selection to node.js over websocket
        self.socket.emit('frequencyBandSelection', { selectedFrequencyBands: self.selectedFrequencyIndices });

        //if boid animation is running, uncheck
        if(running()){
            run(false);
        }
        self.graphicsController.resetBoids(self.graphicsController);

        var bandNames = [];
        //update selected frequency band names
        self.selectedFrequencyIndices.forEach(function(idx, el){
            if(el !== -1)
                bandNames.push(self.frequencyBandNames[idx]);
            else
                bandNames.push('none');
        });
        d3.select('#perc1-label').text('%-ile ' + bandNames[0]);
        d3.select('#perc2-label').text('%-ile ' + bandNames[1]);
        //TODO: get updated calibration values
    });
};

ExperimentUIController.prototype.onChannelSelection = function(){
    var self = this;
    $('select.channel-picker').change(function(){
        //self.selectedChannel = $(this).val();
        self.setSelectedChannelIndices( $(this).val());
        //send channel selection to node.js over websocket
        self.socket.emit('channelSelection', { selectedChannels: self.selectedChannelIndices });
        //if running, uncheck
        if(running()){
            run(false);
        }
        self.graphicsController.resetBoids(self.graphicsController);
        //check which channels haven't been selected and make them opaque
        self.setHorseshoeChannelOpaque();
    });
};

ExperimentUIController.prototype.setHorseshoeChannelOpaque = function(){
    var opaque = [];
    for(var i = 1; i < 5; i++){
        if(this.selectedChannelIndices.indexOf(i) === -1)
            opaque.push({channel: i, opaque: true});
        else
            opaque.push({channel: i, opaque: false});
    }
    this.graphicsController.setHorseshoeChannelOpaque(opaque);
};

ExperimentUIController.prototype.setSelectedChannelIndices = function(selectedChannels){
    //one channel => return array with one number
    if(selectedChannels.length === 1){
        this.selectedChannelIndices = [parseInt(selectedChannels)];
    }//two or more channels => return array of numbers
    else{
       this.selectedChannelIndices = selectedChannels.split('-').map(Number);
    }
};

/********************* PERCENTILE SLIDERS *************************************/
//init sliders for percentage of reward and inhibit
ExperimentUIController.prototype.frequencyPercentileSliders = function(){
    var self = this;
    $('#slider-dividend-percentile').slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: 100,
        step: 10,
        value: 50,
        disabled: true,
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
        disabled: true,
        slide: function( event, ui ) {
            $( "#amount-divisor" ).html( ui.value + '&#37;' );
            self.onSlide(ui, false);
        }
    });
};

//Sliders for percentage of reward and inhibit have been moved
ExperimentUIController.prototype.onSlide = function(ui, isDividend){
    var self = this;
    if(this.percentiles !== undefined){
        if(isDividend){
            this.rewardIdx = ui.value / 10 - 1;
            if(this.percentiles.length !== 0)
                this.constants.setDividendThreshold(this.percentiles[0][this.rewardIdx]);
            if(this.socketConnected)
                this.socket.emit('dividendPercentileChanged', {percentileIdx: self.rewardIdx});
        }else{
            this.inhibitIdx = ui.value / 10 - 1;
            if(this.percentiles.length !== 0)
                this.constants.setDivisorThreshold(this.percentiles[1][this.inhibitIdx]);
            if(this.socketConnected)
                this.socket.emit('divisorPercentileChanged', {percentileIdx: self.inhibitIdx});
        }
        this.trainingRatio = Math.pow(10, this.percentiles[0][this.rewardIdx]) / Math.pow(10, this.percentiles[1][this.inhibitIdx]);
        this.updateTrainingRatioIndicator(this.trainingRatio);
    }
};

/*********************************** Enable or disable sidebar controls **********************************/
ExperimentUIController.prototype.enableSidebarSettings = function(bool){
    $('#slider-dividend-percentile').slider( "option", "disabled", !bool );
    $('#slider-divisor-percentile').slider( "option", "disabled", !bool );
    $('.sb-blue select, .sb-blue input').attr('disabled', !bool);
};

/******************** FULLSCREEN ******************/
ExperimentUIController.prototype.onFullscreen = function(){
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

/****************** WARNING ALERTS ******************/
ExperimentUIController.prototype.displayMuseNotConnected = function(){
    alert('WARNING: Muse is not connected! Please connect it and retry.');
};

ExperimentUIController.prototype.displayExperimentNotCreated = function(){
    alert('WARNING: No experiment was created! Create one and retry.');
};

/******************************** BLUE SIDEBAR ****************************************************/

ExperimentUIController.prototype.initRewardBarGraph = function(){
    var self = this;
    this.barWidth = 60;
    this.barHeight = 150;
    this.rewardYscale = d3.scale.linear()
        .domain([0, 1])//TODO: update when ratio_max is updated
        .range([self.barHeight, 0]);
    this.feedbackYaxis = d3.svg.axis()
        .scale(this.rewardYscale)
        .orient('left')
        .ticks(3);
    this.rewardChart = d3.select('#reward-feedback')
        .attr('width', self.barWidth+35)
        .attr('height', self.barHeight+25)
        .append('g')
        .attr('class', 'reward-group')
        .attr('transform','translate(10,0)');

    this.rewardRect = this.rewardChart.selectAll('rect')
        .data([{ratio: 0.5}])//TODO: data is training ratio
        .enter().append('rect')
        .attr('transform', function(){ return 'translate(' + (self.barWidth+20) + ', ' + (self.barHeight+10) + ') rotate(180)';})
        .attr('height', function(d) { return self.rewardYscale(d.ratio) + 'px'; })
        .attr('width', self.barWidth - 1)
        .attr('fill','#033a6e');

    this.rewardChart.append('g')
        .attr('class', 'feedback-y-axis')
        .attr('transform', 'translate(20,10)')
        .attr('fill', 'lavender')
        .call(this.feedbackYaxis);

    this.initTrainingRatioIndicator();
};

ExperimentUIController.prototype.initArtifactBarGraphs = function(){
    var self = this;
    this.artifactYScale = d3.scale.linear()
        .domain([0, 1])
        .range([self.barHeight, 0]);
    this.artifactYaxis = d3.svg.axis()
        .scale(this.artifactYScale)
        .orient('left')
        .ticks(2);

    /***** BLINK ******/
    this.blinkChart = d3.select('#blink-feedback')
        .attr('width', self.barWidth+35)
        .attr('height', self.barHeight+25)
        .append('g')
        .attr('class', 'artifact-group')
        .attr('transform','translate(10,0)');
    this.blinkRect = this.blinkChart.selectAll('rect')
        .data([{blink: 0}])//TODO: data is training ratio
        .enter().append('rect')
        .attr('transform', function(){ return 'translate(' + (self.barWidth+20) + ', ' + (self.barHeight+10) + ') rotate(180)';})
        .attr('height', function(d) { return self.barHeight - self.artifactYScale(d.blink) + 'px'; })
        .attr('width', self.barWidth - 1)
        .attr('fill','#033a6e');
    this.blinkChart.append('g')
        .attr('class', 'artifact-y-axis')
        .attr('transform', 'translate(20,10)')
        .attr('fill', 'lavender')
        .call(this.artifactYaxis);

    /***** JAW CLENCH ******/
    this.jcChart = d3.select('#jaw-clench-feedback')
        .attr('width', self.barWidth+35)
        .attr('height', self.barHeight+25)
        .append('g')
        .attr('class', 'artifact-group')
        .attr('transform','translate(10,0)');
    this.jcRect = this.jcChart.selectAll('rect')
        .data([{jc: 0}])//TODO: data is training ratio
        .enter().append('rect')
        .attr('transform', function(){ return 'translate(' + (self.barWidth+20) + ', ' + (self.barHeight+10) + ') rotate(180)';})
        .attr('height', function(d) { return self.barHeight - self.artifactYScale(d.jc) + 'px'; })
        .attr('width', self.barWidth - 1)
        .attr('fill','#033a6e');
    this.jcChart.append('g')
        .attr('class', 'artifact-y-axis')
        .attr('transform', 'translate(20,10)')
        .attr('fill', 'lavender')
        .call(this.artifactYaxis);

};

ExperimentUIController.prototype.initTrainingRatioIndicator = function(){
    var self = this;
    this.trainingRatioLine = this.rewardChart.append('rect')
        .attr('class', 'training-ratio-line')
        .attr('fill', 'black')
        .attr('width', this.barWidth+20)
        .attr('height', '5')
        .attr('transform', 'translate(5, ' + this.rewardYscale(0.5) + ' )');
};

ExperimentUIController.prototype.updateTrainingRatioIndicator = function(trainingRatio){
    this.trainingRatioLine.attr('transform', 'translate(5, ' + this.rewardYscale(trainingRatio) + ' )' )
};

/**
 * Percentile update. Received when channel or frequency band selection changes.
 */
ExperimentUIController.prototype.onPercentileUpdate = function(){
    var self = this;
    this.socket.on('percentiles', function(data){
        //update Percentiles and training ratio (+ in constants), also update max and min ratio
        self.updatePercentiles(data.percentiles);
    })
};
//todo: split into more functions
ExperimentUIController.prototype.updatePercentiles = function(percentiles){
    this.percentiles = percentiles;
    var dividend = percentiles[0][this.rewardIdx];
    var divisor = percentiles[1][this.inhibitIdx];
    this.constants.setDividendThreshold(dividend);
    this.constants.setDivisorThreshold(divisor);
    //set training ratio
    this.trainingRatio = Math.pow(10, dividend) / Math.pow(10, divisor);
    this.updateTrainingRatioIndicator(this.trainingRatio);

    this.firstFreqBandMin = percentiles[0][0];
    this.secondFreqBandMax = percentiles[1][percentiles[1].length-1];
    this.constants.setMinDividendDivisorRatio(this.firstFreqBandMin, this.secondFreqBandMax);
    this.constants.setMaxDividendDivisorRatio(percentiles[0][percentiles[0].length-1],percentiles[1][0]);
};

ExperimentUIController.prototype.onBlinkUpdate = function(){
    var self = this;
    this.socket.on('blink', function(data){
        self.updateBlinkBarGraph(data.blink);
    })
};

ExperimentUIController.prototype.updateBlinkBarGraph = function(blink){
    var self = this;
    this.blinkRect.data([{blink: blink}])
        .attr('height', function(d) { return self.barHeight - self.artifactYScale(d.blink) + 'px'; });
};

ExperimentUIController.prototype.onJawClenchUpdate = function(){
    var self = this;
    this.socket.on('jawClench', function(data){
        self.updateJawClenchBarGraph(data.jawClench);
    })
};

ExperimentUIController.prototype.updateJawClenchBarGraph = function(jawClench){
    var self = this;
    this.jcRect.data([{jc: jawClench}])
        .attr('height', function(d) { return self.barHeight - self.artifactYScale(d.jc) + 'px'; });
};

ExperimentUIController.prototype.updateRewardBarGraph = function(ratio){
    var self = this;
    this.rewardRect.data([{ratio: ratio[1]}])
        .attr('height', function(d) { return self.barHeight - self.rewardYscale(d.ratio) + 'px'; });
};

ExperimentUIController.prototype.updateRewardScaleMax = function(maxRatio){
    if(maxRatio > this.rewardYscale.domain()[1]){
        this.rewardYscale.domain([0, maxRatio]);
        this.rewardChart.select('.feedback-y-axis')
            .call(this.feedbackYaxis);
        this.updateTrainingRatioIndicator(this.trainingRatio);
    }
};

ExperimentUIController.prototype.setMuseConnected = function(bool){
    this.museConnected = bool;
};

ExperimentUIController.prototype.setExperimentControllerExists = function(bool){
    this.experimentControllerExists = bool;
};