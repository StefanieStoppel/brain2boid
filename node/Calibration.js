/**
 * Created by Stefanie on 13.05.2015.
 */

//gauss for movinge percentile
var gauss = require('gauss');
var Collection = gauss.Collection;

var CHANNELS = [{name: 'T9', index: 1},
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
        {name: 'gamma', index: 4}];

var calibrationRunning = false;
//{freqBandName: 'name', chan: 1, val: 1.49356585}

function Calibration(timeInSeconds){
    this.collection = new Collection();
    this.calibrationTime = timeInSeconds * 1000;// calibration time in ms
    this.quantileFirstBand = [];
    this.quantileSecondBand = [];
}




// export the class
module.exports = Calibration;