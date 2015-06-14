//Constants

var MIN_DESIRED_SEPARATION = 5,//(conc)
    MAX_DESIRED_SEPARATION = 45,//(mellow)
    MIN_NORMAL_SPEED = 1,//(mellow)
    MAX_NORMAL_SPEED = 5,//(conc)
    MIN_SEPARATION_FACTOR = 1.0,//(conc)
    MAX_SEPARATION_FACTOR = 1.8;//(mellow)

var NEIGHBOR_DISTANCE = 80,
    DESIRED_SEPARATION = 15,//min: 5(c); max: 50(m)
    NORMAL_SPEED = 3,//1(m) - 2(c)
    MAX_SPEED = 100,
    MAX_FORCE = 0.03,
    SEPARATION_FACTOR = 1.5,//1.0(c) - 1.8(m); too high (4.0): they separate and turn around their own axis
    ALIGNMENT_FACTOR = 1.3,
    COHESION_FACTOR = 1.3;//0.8(m) - 1.5(c)
//muse experimental values
var MELLOW = 0,
    CONCENTRATION = 0;
var THETA_ALPHA_RATIO = [];
var COLOUR = 'yellow';//default
var BOID_SCALE = "scale(1)";

/** Frequencies and ratios **/
var FREQUENCY_BANDS = [];
var MOV_AVG = 0.3;


var DIVIDEND_THRESH = 0, DIVISOR_THRESH = 0,
    DIVIDEND_DIVISOR_RATIO_MIN = 0,
    DIVIDEND_DIVISOR_RATIO_MAX = 0.5,
    RATIO = ['', 0.5],
    TRAINING_RATIO = 0.5;
var training_ratio_display, ratio_display;

var colourScale = d3.scale.linear()
        .domain([DIVIDEND_DIVISOR_RATIO_MIN, TRAINING_RATIO])
        .range(["magenta","mediumspringgreen"]); //more alpha (atm) = green, more beta = yellow

var boidSizeScale = d3.scale.linear()
        .domain([DIVIDEND_DIVISOR_RATIO_MIN, TRAINING_RATIO])
        .range(["scale(0.8)", "scale(3)"]);

var boidSpeedScale = d3.scale.quantize()
    .domain([DIVIDEND_DIVISOR_RATIO_MIN, DIVIDEND_DIVISOR_RATIO_MAX])
    .range([30, 15,  10, 5, 3, 1, 0.5, 0]);

/*var boidSpeedScale = d3.scale.linear()
    .domain([DIVIDEND_DIVISOR_RATIO_MIN, DIVIDEND_DIVISOR_RATIO_MAX])
    .range([50, 0]);
*/

function Constants(){
	training_ratio_display = d3.select('#training-ratio')
        .datum(TRAINING_RATIO)
        .attr('value', function(d){ return d; });
    ratio_display = d3.select('#ratio')
        .datum(RATIO)
        .attr('value', function(d){ return d[1]; });
}

Constants.prototype.setMellow = function(mellowValue){
  MELLOW = mellowValue;
  this.setDesiredSeparation();
  //this.setNormalSpeed();
};

Constants.prototype.setConcentration = function(concentrationValue){
  CONCENTRATION = concentrationValue;
  this.setDesiredSeparation();
  //this.setNormalSpeed();
};

Constants.prototype.getBoidSizeScale = function(){
    return BOID_SCALE;
};

Constants.prototype.setBoidSizeScale = function(scale){
    BOID_SCALE = scale;
};

Constants.prototype.updateBoidSizeScale = function(){
    boidSizeScale.domain([DIVIDEND_DIVISOR_RATIO_MIN, DIVIDEND_DIVISOR_RATIO_MAX]);
};

Constants.prototype.setBoidSizeScaleByFreqRatio = function(){
    BOID_SCALE = boidSizeScale(RATIO[1]);
};

/******* PERCENTILES ********/

/**
 * Example case: Training the alpha/beta ratio
 * alpha = dividend
 * beta = divisor
 * Initially, set threshold for dividend (train up) so, that 70% of the values are
 * ABOVE the threshold.
 * The threshold for the divisor (train down) needs to be set, so that 70% of the values are
 * BELOW the threshold.
 *
 */
/**
 * Set frequency band names
 * @param frequencyBands{Array}
 */
Constants.prototype.setFrequencyBands = function(frequencyBands){
    FREQUENCY_BANDS = frequencyBands;
};

//everything < TRAINING_RATIO = DIVIDEND_THRESH/DIVISOR_THRESH is yellow
//set to >30%
Constants.prototype.setDividendThreshold = function(lowThreshold){
    DIVIDEND_THRESH = lowThreshold;
    console.log('DIVIDEND_TRESH: ' + lowThreshold);
    this.updateTrainingRatio();
    this.updateColourScale();
    this.setColourByFreqRatio();
};

//set to <70%
Constants.prototype.setDivisorThreshold = function(highThreshold){
    DIVISOR_THRESH = highThreshold;
    console.log('DIVISOR_TRESH: ' + highThreshold);
    this.updateTrainingRatio();
    this.updateColourScale();
    this.setColourByFreqRatio();
};

Constants.prototype.setMaxDividendDivisorRatio = function(highestDividend, lowestDivisor){
    DIVIDEND_DIVISOR_RATIO_MAX = highestDividend / lowestDivisor;
    this.updateBoidSpeedScale();
    this.setColourByFreqRatio();
    this.updateColourScale();
    // this.updateBoidSizeScale();
    //this.setBoidSizeScaleByFreqRatio();
};

Constants.prototype.setMinDividendDivisorRatio = function(lowestDividend, highestDivisor){
    DIVIDEND_DIVISOR_RATIO_MIN = lowestDividend / highestDivisor;
    this.updateColourScale();
    this.setColourByFreqRatio();
   // this.updateBoidSpeedScale();
    //this.updateBoidSizeScale();
    //this.setBoidSizeScaleByFreqRatio();
};

Constants.prototype.setRatioMin = function(ratioMin){
    DIVIDEND_DIVISOR_RATIO_MIN = ratioMin;
    this.updateBoidSpeedScale();
    //this.updateColourScale();
    this.setColourByFreqRatio();
};

Constants.prototype.setRatioMax = function(ratioMax){
    DIVIDEND_DIVISOR_RATIO_MAX = ratioMax;
    this.updateBoidSpeedScale();
    this.updateColourScale();
    this.setColourByFreqRatio();
};

Constants.prototype.updateTrainingRatio = function(){
    TRAINING_RATIO = DIVIDEND_THRESH / DIVISOR_THRESH;
    training_ratio_display.datum(TRAINING_RATIO).attr('value', function(d){ return d; });
};

Constants.prototype.setRatio = function(ratio){
    RATIO = ratio;
    ratio_display.datum(RATIO)
        .attr('value', function(d){ return d[1]; });
    this.setColourByFreqRatio();
    this.setFrequencyBands(ratio.slice(0,1).toString().split('/'));
    this.setNormalSpeed();
};

Constants.prototype.updateColourScale = function(){
    //colourScale.domain([DIVIDEND_DIVISOR_RATIO_MIN, (DIVIDEND_DIVISOR_RATIO_MAX]);
    colourScale.domain([DIVIDEND_DIVISOR_RATIO_MIN, (DIVIDEND_DIVISOR_RATIO_MAX + TRAINING_RATIO) / 2]);
};

Constants.prototype.updateBoidSpeedScale = function(){
    boidSpeedScale.domain([DIVIDEND_DIVISOR_RATIO_MIN, DIVIDEND_DIVISOR_RATIO_MAX]);
};


Constants.prototype.setColourByFreqRatio = function(){
    COLOUR = colourScale(RATIO[1]);
};

Constants.prototype.setDesiredSeparation = function(){
     DESIRED_SEPARATION = ((MELLOW * (MAX_DESIRED_SEPARATION-MIN_DESIRED_SEPARATION) + MIN_DESIRED_SEPARATION) +
                  (MAX_DESIRED_SEPARATION - CONCENTRATION * (MAX_DESIRED_SEPARATION-MIN_DESIRED_SEPARATION))) / 2;
};

Constants.prototype.setNormalSpeed = function(){
   if(boidSpeedScale(RATIO[1]) != NORMAL_SPEED ){
        NORMAL_SPEED = boidSpeedScale(RATIO[1]);
        console.log(NORMAL_SPEED);
   }
};

Constants.prototype.getColour = function(){
	return COLOUR;
};

Constants.prototype.getDesiredSeparation = function(){
	return DESIRED_SEPARATION;
}

Constants.prototype.getNeighbourDistance = function(){
	return NEIGHBOR_DISTANCE;
}

Constants.prototype.getNormalSpeed = function(){
	return NORMAL_SPEED;
}

Constants.prototype.getMaxSpeed = function(){
	return MAX_SPEED;
}

Constants.prototype.getMaxForce = function(){
	return MAX_FORCE;
}

Constants.prototype.getSeparationFactor = function(){
	return SEPARATION_FACTOR;
}

Constants.prototype.getAlignmentFactor = function(){
	return ALIGNMENT_FACTOR;
}

Constants.prototype.getCohesionFactor = function(){
	return COHESION_FACTOR;
}