/**
 * This class is the main control for the experiment environment. It keeps track of
 * all the data, starts and stops trials and saves the trial data to a json array, which
 * is converted to a csv file at the end of each experiment.
 *
 **/
//gauss for movinge percentile
var gauss = require('gauss');
var Collection = gauss.Collection;
var Points = require('./Points.js');
TIMER = undefined;

function ExperimentController(age, gender, mode, socket){ //age and gender of subject, passed from browser input field on experiment start
    //collections for all experiment modes
    this.calibrationCollection = new Collection();
    this.test1Collection = new Collection();
    this.freeNFCollection = new Collection();
    this.test2Collection = new Collection();

    /* the experiment mode:
     * 0: calibration
     * 1: first trial with point scores
     * 2: unsupervised mode (free mode)
     * 3: second trial with point scores
     */
    this.mode = mode;//default: calibration
    //WebSocket
    this.socket = socket;
    //Age and gender of experiment subject
    this.age = age;
    this.gender = gender;

    //json array with all experiment data, will be written to csv file
    this.jsonExpData = [];
    //percentiles for both frequency bands
    this.percentilesDividendIdx = 0;
    this.percentilesDivisorIdx = 0;
    this.percentilesDividend = new Collection();
    this.percentilesDivisor = new Collection();
    //threshold values ( thresholdRatio = dividend / divisor = alphaMed / BetaMed )
    this.thresholdRatio = 0;
    this.dividend = {value: 0, percentile: 0, band: ''};//{value: x, percentile: y, band: z}
    this.divisor =  {value: 0, percentile: 0, band: ''};
    this.timeAboveRatio = 0;//measures time above threshold for points
    //is experiment running or not
    this.experimentRunning = false;
    this.duration = 1000;//experiment duration
    this.test1Points = new Points(); // points before neurofeedback
    this.test2Points = new Points(); // points after  neurofeedback

    //TIMER = undefined;// timer for counting points
    //TIMEOUT = undefined;// timer for counting points
}

ExperimentController.prototype.setPercentileDividendIdx = function(idx){
    this.percentilesDividendIdx = idx;
};

ExperimentController.prototype.setPercentileDivisorIdx = function(idx){
    this.percentilesDivisorIdx = idx;
};
/**
 * Calibration.
 *
 * @param freqBand1
 * @param freqBand2
 * @param channelName1
 * @param percentile1
 * @param channelName2
 * @param percentile2
 * @param emitPercentiles
 */
ExperimentController.prototype.calibrate = function(freqBand1, freqBand2, channelName1, percentile1, channelName2, percentile2, emitPercentiles){
    if(this.mode === 0) {
        var self = this;
        this.experimentRunning = true;
        setTimeout(
            function () {
                self.experimentRunning = false;
                var res = self.getQuantileResults(freqBand1, freqBand2, channelName1, percentile1, channelName2, percentile2);
                emitPercentiles(res);
            },
            this.duration
        );
    }
};

ExperimentController.prototype.test1 = function(emitPoints){
    if(this.mode === 1){
        var self = this;
        this.experimentRunning = true;
        setTimeout(
            function(){
                self.experimentRunning = false;
                //measure:
                //a) time (latency) to when the ratio is reached
                emitPoints(self.getTest1Points());
            },
            self.duration
        );
    }
};

ExperimentController.prototype.getQuantileResults = function(freqBand1, freqBand2, channelIdx1, quantile1, channelIdx2, quantile2){
    //freqBand2, channelName2 and percentile2 can be undefined
    var firstBandSelChans = this.calibrationCollection.find(function(e) { return e.freqBandName === freqBand1; })
        .find(function(e) { return e.chan === channelIdx1 || e.chan === channelIdx2; });
    var vecFirstBandFirstChan = firstBandSelChans.find(function(e) {return e.chan === channelIdx1})
        .map(function(el){ return el.val; }).toVector();
    var vecFirstBandSecondChan = firstBandSelChans.find(function(e) {return e.chan === channelIdx2})
        .map(function(el){ return el.val; }).toVector();
    var firstBandRes = vecFirstBandFirstChan.add(vecFirstBandSecondChan).divide(2);
    //TODO: solve error RangeError: Subset quantity is greater than the Vector length

    this.percentilesDividend =  firstBandRes.quantile(quantile1);
    //TODO: set dividend
    this.setDividend(this.percentilesDividend[this.percentilesDividendIdx], this.percentilesDividendIdx, freqBand1);


    //TODO: testen was raus kommen wenn nur ein Frequenzband ausgew?hlt wurde
    var secondBandSelChans = this.calibrationCollection.find(function(e) { return e.freqBandName === freqBand2; })
        .find(function(e) { return e.chan === channelIdx1 || e.chan === channelIdx2; });
    var vecSecondBandFirstChan = secondBandSelChans.find(function(e) {return e.chan === channelIdx1})
        .map(function(el){ return el.val; }).toVector();
    var vecSecondBandSecondChan = secondBandSelChans.find(function(e) {return e.chan === channelIdx2})
        .map(function(el){ return el.val; }).toVector();
    var secondBandRes = vecSecondBandFirstChan.add(vecSecondBandSecondChan).divide(2);

    this.percentilesDivisor = secondBandRes.quantile(quantile2);
    //set divisor
    this.setDivisor(this.percentilesDivisor[this.percentilesDivisorIdx], this.percentilesDivisorIdx, freqBand2);

    //Quantiles as specified
    console.log("quantiles for average of band " + freqBand1 + " over channel(s) " + channelIdx1 + ", " +channelIdx2 + ": " +  this.percentilesDividend);
    console.log("quantiles for average of band " + freqBand2 + " over channel(s) " + channelIdx1 + ", " +channelIdx2 + ": " +  this.percentilesDivisor);

    return [this.percentilesDividend, this.percentilesDivisor];
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
        case 1:
            //todo: 3 POINTS CASES
            this.test1Collection.append(obj);
            break;
        case 2:
            this.freeNFCollection.append(obj);
            break;
        case 3:
            this.test2Collection.append(obj);
    }
};

ExperimentController.prototype.getExperimentRunning = function(){
    return this.experimentRunning;
};

ExperimentController.prototype.setMode = function(mode){
    this.mode = mode;
};

ExperimentController.prototype.getMode = function(){
    return this.mode;
};

ExperimentController.prototype.getTest1Points = function(){
    return this.test1Points.getPoints();
};

ExperimentController.prototype.setDuration = function(durInSec){
    this.duration = durInSec * 1000;
};

ExperimentController.prototype.measure = function(){
    //measure median frequency for both bands + ratio, min and max ratio, per trial.
    //also count how many times the ratio crossed the threshold, and the latency of each crossing.
    var crossedThreshCount = 0,
        trialRatioMed = 0,
        trialRatioMin = 1,
        trialRatioMax = 0;

};

ExperimentController.prototype.setRatioMin = function(ratioMin){
    this.ratioMin = ratioMin;

};

ExperimentController.prototype.setRatioMax = function(ratioMax){
    this.ratioMax = ratioMax;
    //TODO: test
    if(this.experimentRunning){
        if(this.mode === 1){
            this.test1Points.add(ratioMax * 1000);
        }else if(this.mode === 3){
            this.test2Points.add(ratioMax * 1000);
        }
    }
};

ExperimentController.prototype.setRatio = function(ratio){
    var self = this;
    //console.log('ExperimentController.setRatio()');
    if(this.experimentRunning)
    {
        console.log('ratio: ' + ratio + ', threshold: ' +this.thresholdRatio);
        // 1) POINTS: ratio over threshold
        if(ratio > this.thresholdRatio){
            if(self.timeAboveRatio === 0){
                self.timeAboveRatio = process.hrtime();
                TIMER = setInterval(function(){
                    if(self.mode === 1){
                        self.test1Points.add(100);
                        self.socket.emit('updatePoints', {points: self.test1Points.getPoints()});
                    }/*
                    else if(self.mode === 3){
                        self.test2Points.add(10);
                    }*/
                    console.log('over ratio');
                }, 500);
            }
        }
        if(ratio < this.thresholdRatio){//clear interval when ratio falls below thresh
            if(typeof TIMER !== 'undefined'){
                clearInterval(TIMER);
                //TODO: write start and end of interval over threshold to json array
                //TODO: average of all values in that interval: points = deltaRatio = (avgRatioInterval - thresh) * 1000
                //TIMER = undefined;
                //time difference
                var diff = process.hrtime(self.timeAboveRatio);//idx 0: seconds, idx 1: nanoseconds
               // self.test1Points.add(diff[0]*1000);
                //self.socket.emit('updatePoints', {points: self.test1Points.getPoints()});
                self.timeAboveRatio = 0;
            }

        }
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
    console.log('######dividend.value: ' + this.dividend.value);
    this.setThresholdRatio(dividendVal, this.divisor.value);
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
    this.setThresholdRatio(this.dividend.value, divisorVal);
};

/***
 * Threshold ratio is set.
 *
 * @param dividendMed
 * @param divisorMed
 */
ExperimentController.prototype.setThresholdRatio = function(dividendMed, divisorMed){
    if(this.dividend.value !== 0 && this.divisor.value !== 0)
        this.thresholdRatio = dividendMed / divisorMed;
};

module.exports = ExperimentController;