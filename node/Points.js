/**
 * This class is responsible for counting points earned by experiment subject during Neurofeedback.
 * Points can be earned the following ways:
 * 1) When the user manages to hold the ratio above the training threshold for more than 0.5 sec,
 *    each ms after that equals 1 point. Adds up until the ratio falls below the threshold again.
 * 2) The median value is calculated for the time the ratio is above threshold.
 *    p = deltaRatio = (medRatio - thresh) * 10000
 * 3) If RATIO_MAX is updated, the user gets extra points.
 *    Each time points are p = RATIO_MAX * 1000
 *
 *
 *
 **/
/**
 * TODO: - different points counts for 1) - 3)
 * what do we actually t-test? which points or values?
 */

function Points(){
    this.threshPoints = 0;// 1)
    this.deltaRatioPoints = 0; // 2)
    this.ratioMaxPoints = 0; // 3)
    this.totalPoints = 0;
}

Points.prototype.addThreshPoints = function(amount){
    this.points += amount;
    this.totalPoints += amount;
};

Points.prototype.getThreshPoints = function(amount){
    return this.threshPoints;
};

Points.prototype.addDeltaRatioPoints = function(amount){
    this.points += amount;
    this.totalPoints += amount;
};

Points.prototype.getDeltaRatioPoints = function(amount){
    return this.threshPoints;
};

Points.prototype.addRatioMaxPoints = function(amount){
    this.points += amount;
    this.totalPoints += amount;
};

Points.prototype.getRatioMaxPoints = function(amount){
    return this.threshPoints;
};

Points.prototype.getTotalPoints = function(){
    return this.totalPoints;
};

module.exports = Points;