/**
 * This class holds the data that is shared by all boids like colour, speed etc.
 * This data is influenced by the measured values.
 * @type {number}
 */

var NEIGHBOR_DISTANCE = 80,
    DESIRED_SEPARATION = 15,//min: 5(c); max: 50(m)
    NORMAL_SPEED = 15,//1(m) - 2(c)
    MAX_SPEED = 100,
    MAX_FORCE = 0.03,
    SEPARATION_FACTOR = 1.5,//1.0(c) - 1.8(m); too high (4.0): they separate and turn around their own axis
    ALIGNMENT_FACTOR = 1.3,
    COHESION_FACTOR = 1.3;//0.8(m) - 1.5(c)

var COLOUR = "red";//default
var BOID_OPACITY = 1;
/** Frequencies and ratios **/
var FREQUENCY_BANDS = [];


var DIVIDEND_THRESH = 0, DIVISOR_THRESH = 0,
    DIVIDEND_DIVISOR_RATIO_MIN = 0,
    DIVIDEND_DIVISOR_RATIO_MAX = 0.5,
    RATIO = ['', 0.5],
    TRAINING_RATIO = 0.5;
var training_ratio_display, ratio_display;

var colourScale = d3.scale.linear()
        .domain([DIVIDEND_DIVISOR_RATIO_MIN, TRAINING_RATIO])
        //.range(["magenta","mediumspringgreen"]); //more alpha (atm) = green, more beta = yellow
        .range(["red", "#261ADB"]);

var boidSizeScale = d3.scale.linear()
        .domain([DIVIDEND_DIVISOR_RATIO_MIN, TRAINING_RATIO])
        .range(["scale(0.8)", "scale(3)"]);

var boidSpeedScale = d3.scale.quantize()
    .domain([DIVIDEND_DIVISOR_RATIO_MIN, DIVIDEND_DIVISOR_RATIO_MAX])
    .range([50, 25, 15, 5, 3, 1, 0.5, 0]);


function BoidData(){
	training_ratio_display = d3.select('#training-ratio')
        .datum(TRAINING_RATIO)
        .attr('value', function(d){ return d; });
    ratio_display = d3.select('#ratio')
        .datum(RATIO)
        .attr('value', function(d){ return d[1]; });
}

BoidData.prototype.setBoidOpacity = function(opacity){
    BOID_OPACITY = opacity;
};

BoidData.prototype.getBoidOpacity = function(){
    return BOID_OPACITY;
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
BoidData.prototype.setFrequencyBands = function(frequencyBands){
    FREQUENCY_BANDS = frequencyBands;
};

/**
 * First frequency band threshold.
 * @param lowThreshold
 */
BoidData.prototype.setDividendThreshold = function(lowThreshold){
    console.log('before DIVIDEND_TRESH: ' + DIVIDEND_THRESH);
    DIVIDEND_THRESH = lowThreshold;
    console.log('after DIVIDEND_TRESH: ' + lowThreshold);
    this.updateTrainingRatio();
    this.updateColourScale();
    this.setColourByFreqRatio();
};

/**
 * second frequency band threshold
 * @param highThreshold
 */
BoidData.prototype.setDivisorThreshold = function(highThreshold){
    console.log('before DIVISOR_TRESH: ' + DIVISOR_THRESH);
    DIVISOR_THRESH = highThreshold;
    console.log('after DIVISOR_TRESH: ' + highThreshold);
    this.updateTrainingRatio();
    this.updateColourScale();
    this.setColourByFreqRatio();
};

BoidData.prototype.setMaxDividendDivisorRatio = function(highestDividend, lowestDivisor){
    DIVIDEND_DIVISOR_RATIO_MAX = highestDividend / lowestDivisor;
    this.updateBoidSpeedScale();
    this.setColourByFreqRatio();
    this.updateColourScale();
};

BoidData.prototype.setMinDividendDivisorRatio = function(lowestDividend, highestDivisor){
    DIVIDEND_DIVISOR_RATIO_MIN = lowestDividend / highestDivisor;
    this.updateColourScale();
    this.setColourByFreqRatio();
};

BoidData.prototype.setRatioMin = function(ratioMin){
    DIVIDEND_DIVISOR_RATIO_MIN = ratioMin;
    this.updateBoidSpeedScale();
    this.setColourByFreqRatio();
};

BoidData.prototype.setRatioMax = function(ratioMax){
    DIVIDEND_DIVISOR_RATIO_MAX = ratioMax;
    this.updateBoidSpeedScale();
    this.updateColourScale();
    this.setColourByFreqRatio();
};

/**
 * Threshold (=training ratio) update.
 */
BoidData.prototype.updateTrainingRatio = function(){
    TRAINING_RATIO = Math.pow(10, DIVIDEND_THRESH) / Math.pow(10, DIVISOR_THRESH);
    training_ratio_display.datum(TRAINING_RATIO)
        .attr('value', function(d){ return d; });
};
/**
 * Update measured ratio
 * @param ratio
 */
BoidData.prototype.updateRatio = function(ratio){
    RATIO = ratio;
    ratio_display.datum(RATIO)
        .attr('value', function(d){ return d[1].toFixed(5); });
    this.setColourByFreqRatio();
    this.setFrequencyBands(ratio.slice(0,1).toString().split('/'));
    this.setNormalSpeed();
};

/**
 * Change the colour scale of the boids.
 */
BoidData.prototype.updateColourScale = function(){
    colourScale.domain([DIVIDEND_DIVISOR_RATIO_MIN,  TRAINING_RATIO]);
};

/**
 * Update speed scale of the boids
 */
BoidData.prototype.updateBoidSpeedScale = function(){
    boidSpeedScale.domain([DIVIDEND_DIVISOR_RATIO_MIN, (DIVIDEND_DIVISOR_RATIO_MAX + TRAINING_RATIO) / 2]);
};

/**
 * Change the boid colour depending on the measured ratio.
 */
BoidData.prototype.setColourByFreqRatio = function(){
    COLOUR = colourScale(RATIO[1]);
};

/*
BoidData.prototype.setDesiredSeparation = function(){
     DESIRED_SEPARATION = ((MELLOW * (MAX_DESIRED_SEPARATION-MIN_DESIRED_SEPARATION) + MIN_DESIRED_SEPARATION) +
                  (MAX_DESIRED_SEPARATION - CONCENTRATION * (MAX_DESIRED_SEPARATION-MIN_DESIRED_SEPARATION))) / 2;
};*/

/**
 * Update boid speed.
 */
BoidData.prototype.setNormalSpeed = function(){
   if(boidSpeedScale(RATIO[1]) != NORMAL_SPEED ){
        NORMAL_SPEED = boidSpeedScale(RATIO[1]);
   }
};

BoidData.prototype.getColour = function(){
	return COLOUR;
};

BoidData.prototype.getDesiredSeparation = function(){
	return DESIRED_SEPARATION;
}

BoidData.prototype.getNeighbourDistance = function(){
	return NEIGHBOR_DISTANCE;
}

BoidData.prototype.getNormalSpeed = function(){
	return NORMAL_SPEED;
}

BoidData.prototype.getMaxSpeed = function(){
	return MAX_SPEED;
}

BoidData.prototype.getMaxForce = function(){
	return MAX_FORCE;
}

BoidData.prototype.getSeparationFactor = function(){
	return SEPARATION_FACTOR;
}

BoidData.prototype.getAlignmentFactor = function(){
	return ALIGNMENT_FACTOR;
}

BoidData.prototype.getCohesionFactor = function(){
	return COHESION_FACTOR;
}