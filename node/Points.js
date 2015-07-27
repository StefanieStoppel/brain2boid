/**
 * This class is responsible for counting points earned by experiment subjects during Neurofeedback.
 * Points are earned when the user manages to hold the ratio above the training threshold.
 * Each ms equals 1 point. Adds up until the ratio falls below the threshold again.
 **/

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

Points.prototype.getTotalPoints = function(){
    return this.totalPoints;
};

module.exports = Points;