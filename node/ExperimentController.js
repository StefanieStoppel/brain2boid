/**
 * This class is the main control for the experiment environment. It keeps track of
 * all the data, starts and stops trials and saves the trial data to a json array, which
 * is converted to a csv file at the end of each experiment.
 *
 **/
//gauss for movinge percentile
var gauss = require('gauss');
var Collection = gauss.Collection;

function ExperimentController(age, gender, mode, socket){ //age and gender of subject, passed from browser input field on experiment start
    //calibration data
    this.calibrationCollection = new Collection();
    this.quantileFirstBand = [];
    this.quantileSecondBand = [];
    //other modes collections (data storage)
    this.test1Collection = new Collection();
    this.test2Collection = new Collection();
    this.freeNFCollection = new Collection();

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
    //threshold values ( thresholdRatio = dividend / divisor = alphaMed / BetaMed )
    this.thresholdRatio = 0;
    this.dividend = {value: 0, percentile: 0, band: ''};//{value: x, percentile: y, band: z}
    this.divisor =  {value: 0, percentile: 0, band: ''};
    //is experiment running or not
    this.experimentRunning = false;
    //experiment duration
    this.duration = 1000;
    //points earned during experiment (+ time over thresh, median value per crossing)
    this.preScore = [];  // experiment before neurofeedback
    this.postScore = []; // experiment after neurofeedback
}



ExperimentController.prototype.calibrate = function(freqBand1, freqBand2, channelName1, percentile1, channelName2, percentile2, emitPercentiles){
    var self = this;
    this.experimentRunning = true;
    setTimeout(function(){
        self.experimentRunning = false;
        emitPercentiles(self.getQuantileResults(freqBand1, freqBand2, channelName1, percentile1, channelName2, percentile2));
    }, this.duration);
};

ExperimentController.prototype.getExperimentRunning = function(){
    return this.experimentRunning;
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

    this.quantileFirstBand =  firstBandRes.quantile(quantile1);

    //TODO: testen was raus kommen wenn nur ein Frequenzband ausgew?hlt wurde
    var secondBandSelChans = this.calibrationCollection.find(function(e) { return e.freqBandName === freqBand2; })
        .find(function(e) { return e.chan === channelIdx1 || e.chan === channelIdx2; });
    var vecSecondBandFirstChan = secondBandSelChans.find(function(e) {return e.chan === channelIdx1})
        .map(function(el){ return el.val; }).toVector();
    var vecSecondBandSecondChan = secondBandSelChans.find(function(e) {return e.chan === channelIdx2})
        .map(function(el){ return el.val; }).toVector();
    var secondBandRes = vecSecondBandFirstChan.add(vecSecondBandSecondChan).divide(2);
    this.quantileSecondBand = secondBandRes.quantile(quantile2);

    //Quantiles as specified
    console.log("quantiles for average of band " + freqBand1 + " over channel(s) " + channelIdx1 + ", " +channelIdx2 + ": " +  this.quantileFirstBand);
    console.log("quantiles for average of band " + freqBand2 + " over channel(s) " + channelIdx1 + ", " +channelIdx2 + ": " +  this.quantileSecondBand);

    return [this.quantileFirstBand, this.quantileSecondBand];
};

/**
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
        case 1://TODO set up
            this.test1Collection.append(obj);
            break;
        case 2:
            this.freeNFCollection.append(obj);
            break;
        case 3:
            this.test2Collection.append(obj);
    }
};


ExperimentController.prototype.setMode = function(mode){
    this.mode = mode;
};

ExperimentController.prototype.setDuration = function(durInSec){
    this.duration = durInSec * 1000;
};

ExperimentController.prototype.startTrial = function(){
    var self = this;
    this.experimentRunning = true;
    setTimeout(
        function(){
            self.experimentRunning = false;
            //measure:
            //a) time (latency) to when the ratio is reached

        },
    self.duration);
};

ExperimentController.prototype.measure = function(){
    //measure median frequency for both bands + ratio, min and max ratio, per trial.
    //also count how many times the ratio crossed the threshold, and the latency of each crossing.
    var crossedThreshCount = 0,
        trialRatioMed = 0,
        trialRatioMin = 1,
        trialRatioMax = 0;
    var trialStartTime = process.hrtime();
};

ExperimentController.prototype.setDividend = function(dividendVal, dividendPercentile, bandName){
    this.dividend = {value: dividendVal, percentile: dividendPercentile, band: bandName};
    this.setThresholdRatio(dividendVal, this.divisor.value);
};

ExperimentController.prototype.setDivisor = function(divisorVal, divisorPercentile, bandName){
    this.divisor =  {value: divisorVal, percentile: divisorPercentile, band: bandName};
    this.setThresholdRatio(this.dividend.value, divisorVal);
};

ExperimentController.prototype.setThresholdRatio = function(dividendMed, divisorMed){
    if(this.dividend !== 0 && this.divisor !== 0)
        this.thresholdRatio = dividendMed / divisorMed;
};

module.exports = ExperimentController;