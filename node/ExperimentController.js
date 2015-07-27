/**
 * This class is the main control for the experiment environment. It keeps track of
 * all the data, starts and stops modes and saves the mode data (ratio, training ratio, frequency bands and points) in a json array, which
 * is converted to a csv file at the end of each experiment.
 *
 **/
var fs = require('fs');
//gauss for movinge percentile
var gauss = require('gauss');
var Collection = gauss.Collection;
var Points = require('./Points.js');
var json2csv = require('json2csv');
TIMER = undefined;
MODE_TIMER = undefined;

function ExperimentController(initials, age, gender, mode, socket){ //age and gender of subject, passed from browser input field on experiment start
    //collections for all experiment modes
    this.calibrationCollection = new Collection();
    this.test1Collection = new Collection();
    this.freeNFCollection = new Collection();
    this.test2Collection = new Collection();

    /* the experiment mode:
     * 0: calibration
     * 1: test calibration threshold
     * 2: first trial with point scores
     * 3: unsupervised mode (free mode)
     * 4: second trial with point scores
     */
    this.mode = mode;//default: calibration
    //WebSocket
    this.socket = socket;
    //Initials, age and gender of experiment subject
    this.initials = initials;
    this.age = age;
    this.gender = gender;

    //json array with all experiment data, will be written to csv file
    this.csvFields = ["ratio", "trainingRatio", "quotientName", "mode", "points"];
    this.jsonExpData = [];
    //percentiles for both frequency bands
    this.percentilesDividendIdx = 0;
    this.percentilesDivisorIdx = 0;
    this.percentilesDividend = new Collection();
    this.percentilesDivisor = new Collection();

    this.dividend = {value: 0, percentile: 0, band: ''};//{value: x, percentile: y, band: z}
    this.divisor =  {value: 0, percentile: 0, band: ''};
    this.trainingRatio = {value: 0, quotientName: ''};
    this.timeAboveRatio = 0;//measures time above threshold for points
    //is experiment running or not
    this.experimentRunning = false;
    this.experimentPaused = false;
    this.pausedByUser = false; //was the experiment paused by the user or because muse is off head?
    this.duration = 10;//experiment duration

    //Point scores
    this.test1Points = new Points(); // points before neurofeedback
    this.test2Points = new Points(); // points after  neurofeedback

    this.touchingForehead = 0;//false

    //listen for updates from sliders regarding reward threshold percentiles
    this.onPercentileDividendChanged();
    this.onPercentileDivisorChanged();
}

ExperimentController.prototype.getCalibrationCollectionLength = function(){
    return this.calibrationCollection.length;
};
/**
 * Different percentile for first band was selected in sidebar.
 */
ExperimentController.prototype.onPercentileDividendChanged = function(){
    var self = this;
    this.socket.on('dividendPercentileChanged', function(data){
        self.setPercentileDividendIdx(data.percentileIdx);
        console.log('Dividend Percentile changed: ' + data.percentileIdx);
        if(self.percentilesDividend.length !== 0)
            self.updateDividendValueAndPercentile(self.percentilesDividend[self.percentilesDividendIdx], self.percentilesDividendIdx)
    });
};

/**
 * Different percentile for second band was selected in sidebar.
 */
ExperimentController.prototype.onPercentileDivisorChanged = function(){
    var self = this;
    this.socket.on('divisorPercentileChanged', function(data){
        self.setPercentileDivisorIdx(data.percentileIdx);
        console.log('Divisor Percentile changed: ' + data.percentileIdx);
        if(self.percentilesDivisor.length !== 0)
            self.updateDivisorValueAndPercentile(self.percentilesDivisor[self.percentilesDivisorIdx], self.percentilesDivisorIdx)
    });
};

ExperimentController.prototype.setPercentileDividendIdx = function(idx){
    this.percentilesDividendIdx = idx;
};

ExperimentController.prototype.setPercentileDivisorIdx = function(idx){
    this.percentilesDivisorIdx = idx;
};

/**
 * Set training ratio.
 * @param trainingRatio
 * @param freqBandQuotientName
 */
ExperimentController.prototype.setTrainingRatio = function(trainingRatio, freqBandQuotientName){
    this.trainingRatio = {value: trainingRatio, quotientName: freqBandQuotientName};
    console.log('Training ratio update: ' +  this.trainingRatio.value);
};

ExperimentController.prototype.setTrainingRatioValue = function(value){
    this.trainingRatio.value = value;
    console.log('Training ratio value update: ' +  this.trainingRatio.value);
};

/**
 * Starts the passed experiment mode and calls the callback when done.
 * @param mode
 * @param callback
 */
ExperimentController.prototype.startExperimentMode = function(mode, callback){
    var self = this;
    this.experimentRunning = true;
    MODE_TIMER = setInterval(function(){
        self.socket.emit('timerUpdate', {time: self.duration});
        self.duration--;
        if(self.duration === 0){
            self.stopExperiment();
            self.stopPointsTimer();
            if(mode === 0) //calibration
                callback();//callback
            else if(mode === 1)//test calibration
                callback();
            else if(mode === 2)//test 1
                callback(self.getTest1Points());
            else if(mode === 3)//free nf
                callback();
            else if(mode === 4)//test2
                callback(self.getTest2Points());
        }
    }, 1000);
};

/**
 * Calculate training ratio from all the calibration values, depending on the passed frequency bands, channels and quantiles.
 * @param freqBand1
 * @param freqBand2
 * @param channelIdx1
 * @param quantile1
 * @param channelIdx2
 * @param quantile2
 * @returns {*}
 */
ExperimentController.prototype.getQuantileResults = function(freqBand1, freqBand2, channelIdx1, quantile1, channelIdx2, quantile2){
    if(this.calibrationCollection.length !== 0){
        //freqBand2, channelName2 and percentile2 can be undefined
        var firstBandSelChans = this.calibrationCollection.find(function(e) { return e.freqBandName === freqBand1; })
            .find(function(e) { return e.chan === channelIdx1 || e.chan === channelIdx2; });
        var vecFirstBandFirstChan = firstBandSelChans.find(function(e) {return e.chan === channelIdx1})
            .map(function(el){ return el.val; }).toVector();
        var vecFirstBandSecondChan = firstBandSelChans.find(function(e) {return e.chan === channelIdx2})
            .map(function(el){ return el.val; }).toVector();
        var firstBandRes = vecFirstBandFirstChan.add(vecFirstBandSecondChan).divide(2);

        this.percentilesDividend = firstBandRes.quantile(quantile1);
        this.percentilesDividendPow = this.percentilesDividend.clone(
            function(el){//el === Array
                for(var i = 0; i < el.length; i++){
                    el[i] = Math.pow(10, el[i]);
                }
                return el;
            }
        );

        this.setDividend(this.percentilesDividend[this.percentilesDividendIdx], this.percentilesDividendIdx, freqBand1);

        if(freqBand2 !== 'none' && channelIdx2 !== -1){//divisor selected ( != 'none' or - )
            var secondBandSelChans = this.calibrationCollection.find(function(e) { return e.freqBandName === freqBand2; })
                .find(function(e) { return e.chan === channelIdx1 || e.chan === channelIdx2; });
            var vecSecondBandFirstChan = secondBandSelChans.find(function(e) {return e.chan === channelIdx1})
                .map(function(el){ return el.val; }).toVector();
            var vecSecondBandSecondChan = secondBandSelChans.find(function(e) {return e.chan === channelIdx2})
                .map(function(el){ return el.val; }).toVector();
            var secondBandRes = vecSecondBandFirstChan.add(vecSecondBandSecondChan).divide(2);

            this.percentilesDivisor = secondBandRes.quantile(quantile2);
            this.percentilesDivisorPow = this.percentilesDivisor.clone(
                function(el){//el === Array
                    for(var i = 0; i < el.length; i++){
                        el[i] = Math.pow(10, el[i]);
                    }
                    return el;
                }
            );
            //set divisor
            this.setDivisor(this.percentilesDivisor[this.percentilesDivisorIdx], this.percentilesDivisorIdx, freqBand2);
        }else{
            this.percentilesDivisor = [];
            for(var i = 0; i < quantile2; i++){
                this.percentilesDivisor.push(undefined);
            }
            this.setDivisor(0, this.percentilesDivisorIdx, freqBand2);
        }
        //set the ratio that is used for training
        this.setTrainingRatio(Math.pow(10, this.dividend.value) / Math.pow(10, this.divisor.value), freqBand1 + '/' + freqBand2);

        //Quantiles as specified
        console.log("quantiles for average of band " + freqBand1 + " over channel(s) " + channelIdx1 + ", " +channelIdx2 + ": " +  this.percentilesDividend);
        console.log("quantiles for average of band " + freqBand2 + " over channel(s) " + channelIdx1 + ", " +channelIdx2 + ": " +  this.percentilesDivisor);
        //pow quantiles
        console.log("pow quantiles: " +  this.percentilesDividendPow);
        console.log("pow quantiles: " +  this.percentilesDivisorPow);

        return [this.percentilesDividend, this.percentilesDivisor];
    }else{
        return null;
    }
};

/**
 * Add the measured values to the right collection, depending on the experiment mode chosen.
 * @param values: [freqBandName, valCh1, valCh2, valCh3, valCh4]
 */
ExperimentController.prototype.addToCollection = function(values){
    var freqBandName = values[0];
    var obj = [];
    values.splice(1).forEach(function(val, idx){
        obj.push({freqBandName: freqBandName, chan: parseInt(idx+1), val: val});
        console.log("appended : {" + freqBandName + ','  +  parseInt(idx+1) +',' + val +'}');
    });
    switch(this.mode){
        case 0:
            this.calibrationCollection.append(obj);
            break;
        //case 1 is only calibration test
        case 2:
            this.test1Collection.append(obj);
            break;
        case 3:
            this.freeNFCollection.append(obj);
            break;
        case 4:
            this.test2Collection.append(obj);
            break;
    }
};

ExperimentController.prototype.getExperimentRunning = function(){
    return this.experimentRunning;
};

ExperimentController.prototype.getExperimentPaused = function(){
    return this.experimentPaused;
};

ExperimentController.prototype.setExperimentPaused = function(bool){
    this.experimentPaused = bool;
};

/**
 * Called when a mode is finished.
 */
ExperimentController.prototype.stopExperiment = function(){
    this.experimentPaused = false;
    this.experimentRunning = false;
    this.clearTimer(MODE_TIMER);

    if(this.mode === 2 || this.mode === 4){
        this.saveAsCSV();
    }
};

/**
 * Save the collected data in the json Array as a .csv file.
 */
ExperimentController.prototype.saveAsCSV = function(){
    var self = this;
    json2csv({ data: self.jsonExpData, fields: self.csvFields }, function(err, csv) {
        if (err)
            console.log(err);
        var filename = '';
        if(self.mode === 2)
            filename = 'test1_' + self.initials + '_' + self.age + '_' + self.gender + '.csv';
        else if(self.mode === 4)
            filename = 'test2_'  + self.initials + '_' + self.age + '_' + self.gender + '.csv';
        fs.writeFile('csv/' + filename, csv, function(err) {
            if (err) throw err;
            console.log('file saved');
        });
    });
    this.socket.emit('jsonTest', {jsonTest: this.jsonExpData, mode: this.mode});
    //clear json data
    this.jsonExpData = [];
};

ExperimentController.prototype.resumeExperiment = function(callback){
    this.experimentPaused = false;
    this.pausedByUser = false;
    this.startExperimentMode(this.mode, callback);
};

ExperimentController.prototype.pauseExperiment = function(){
    this.experimentPaused = true;
    this.experimentRunning = false;
    this.clearTimer(MODE_TIMER);
    //if test1 or test2 were running, it could be that the experiment is paused while
    //we're over the training ratio -> TIMER is running, an points are counted.
    this.stopPointsTimer();
};

ExperimentController.prototype.setPausedByUser = function(bool){
    this.pausedByUser = bool;
};

ExperimentController.prototype.getPausedByUser = function(){
    return this.pausedByUser;
};

ExperimentController.prototype.clearTimer = function(timer){
    if(timer !== undefined){
        clearInterval(timer);
        timer = undefined;
    }
};

ExperimentController.prototype.setMode = function(mode){
    this.mode = mode;
};

ExperimentController.prototype.getMode = function(){
    return this.mode;
};

ExperimentController.prototype.getTest1Points = function(){
    return this.test1Points.getTotalPoints();
};

ExperimentController.prototype.getTest2Points = function(){
    return this.test2Points.getTotalPoints();
};

ExperimentController.prototype.setDuration = function(durInSec){
    this.duration = durInSec;
};

ExperimentController.prototype.getDuration = function(){
    return this.duration;
};

ExperimentController.prototype.setRatioMin = function(ratioMin){
    this.ratioMin = ratioMin;
};


ExperimentController.prototype.setRatioMax = function(ratioMax){
    this.ratioMax = ratioMax;
};

/**
 * Push data into json array.
 * @param ratio
 */
ExperimentController.prototype.pushExperimentData = function(ratio){
    var self = this;
    var points;
    if(this.mode === 2)
        points = this.test1Points.getTotalPoints();
    else if(this.mode === 4)
        points = this.test2Points.getTotalPoints();
    this.jsonExpData.push(
        {
            "ratio": ratio.toString(),
            "trainingRatio": self.trainingRatio.value.toString(),
            "quotientName": self.trainingRatio.quotientName,
            "mode": self.mode.toString(),
            "points": points
        }
    );
};

/**
 * update ratio and check whether its above threshold. if so, start points timer.
 * @param ratio
 */
ExperimentController.prototype.updateRatio = function(ratio){
    if(this.experimentRunning)
    {
        if(this.mode === 2 || this.mode === 4){
            this.pushExperimentData(ratio);
        }

        console.log('ratio: ' + ratio + ', threshold: ' + this.trainingRatio.value);
        // ratio over threshold -> start points timer
        if(ratio > this.trainingRatio.value)
            this.startPointsTimer();
        if(ratio < this.trainingRatio.value)
            this.stopPointsTimer();
    }else{
        this.updatePointsByTime();
    }
};

ExperimentController.prototype.startPointsTimer = function(){
    if(this.timeAboveRatio === 0){
        this.timeAboveRatio = process.hrtime();
        TIMER = setInterval(function(){
            //console.log('over ratio');
        }, 500);
    }
};

ExperimentController.prototype.stopPointsTimer = function(){
    if(TIMER != undefined){
        clearInterval(TIMER);
        TIMER = undefined;
        console.log('TIMER cleared and set to undefined');
        this.updatePointsByTime();
    }
};

/**
 * Update the experiment points depending on the points timer.
 */
ExperimentController.prototype.updatePointsByTime = function(){
    if(this.timeAboveRatio !== 0){
        var diff = process.hrtime(this.timeAboveRatio);//idx 0: seconds, idx 1: nanoseconds
        //change from nano- to milliseconds
        var ms = Math.floor(diff[1] / 1000000);
        var p = Math.floor(diff[0] * 1000 + ms);
        if(this.mode === 2){
            console.log('emitting points: ' + p);
            this.test1Points.addThreshPoints(p);
            this.socket.emit('updatePoints', {points: p});
        }else if(this.mode === 4){
            console.log('emitting points: ' + p);
            this.test2Points.addThreshPoints(p);
            this.socket.emit('updatePoints', {points: p});
        }
        this.timeAboveRatio = 0;
    }
};

/***
 * Threshold dividend band and values.
 *
 * @param dividendVal
 * @param dividendPercentile
 * @param bandName
 */
ExperimentController.prototype.setDividend = function(dividendVal, dividendPercentile, bandName){
    this.dividend = {value: dividendVal, percentile: dividendPercentile, band: bandName};
    console.log('######dividend.valure: ' + this.dividend.value);
    this.setTrainingRatioValue(Math.pow(10, dividendVal) / Math.pow(10, this.divisor.value));
};

ExperimentController.prototype.updateDividendValueAndPercentile = function(val, perc){
    this.dividend.value = val;
    this.dividend.percentile = perc;
    console.log('this.dividend.value: ' + val + ', and percentile: ' + perc + ' changed');
    this.setTrainingRatio(Math.pow(10, this.dividend.value) / Math.pow(10, this.divisor.value), this.dividend.band + '/' + this.divisor.band);
};

/**
 * Threshold divisor band and values.
 *
 * @param divisorVal
 * @param divisorPercentile
 * @param bandName
 */
ExperimentController.prototype.setDivisor = function(divisorVal, divisorPercentile, bandName){
    this.divisor =  {value: divisorVal, percentile: divisorPercentile, band: bandName};
    console.log('#####divisor.value ' + this.divisor.value);
    this.setTrainingRatioValue(Math.pow(10, this.dividend.value) / Math.pow(10, divisorVal))
};

ExperimentController.prototype.updateDivisorValueAndPercentile = function(val, perc){
    this.divisor.value = val;
    this.divisor.percentile = perc;
    console.log('this.divisor.value: ' + val + ', and percentile: ' + perc + ' changed');
    this.setTrainingRatio(Math.pow(10, this.dividend.value) / Math.pow(10, this.divisor.value), this.dividend.band + '/' + this.divisor.band);
};


ExperimentController.prototype.setTouchingForehead = function(msg){
    this.touchingForehead = msg[1];
};

ExperimentController.prototype.getTouchingForehead = function(){
    return this.touchingForehead;
};

/**** not used ****/
ExperimentController.prototype.getHorseshoeOK = function(){
    var ok = true;
    for(var i = 0; i < this.horseshoe.length; i++){
        if(this.horseshoe[i] === 3 || this.horseshoe[i] === 4){
            ok = false;
            break;
        }
    }
    return ok;
};


module.exports = ExperimentController;