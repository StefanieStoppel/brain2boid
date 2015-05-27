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
 **/

function Points(){
    this.points = 0;
}

Points.prototype.add = function(amount){
    this.points += amount;
};

Points.prototype.substract = function(amount){
    this.points -= amount;
};

Points.prototype.getPoints = function(){
    return this.points;
};

module.exports = Points;