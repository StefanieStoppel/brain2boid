/**
 * This Class represents the individuals of the flock, the so-called boids.
 * The basic functionalities of this class were implemented in the course of the lecture
 * "Ausgewählte Themen der Medieninformatik", held by Prof. Dr. Weitz in the summer semester of 2014.
 */

var BOID_WIDTH = 6,
    BOID_LENGTH = 12,
    NEIGHBOR_DISTANCE = 80,
    DESIRED_SEPARATION = 15,//min: 5(c); max: 45(m)
    NORMAL_SPEED = 1,//1(m) - 2(c)
    MAX_SPEED = 2,
    MAX_FORCE = 0.01,
    SEPARATION_FACTOR = 1.5,//1.0(c) - 1.8(m); too high (4.0): they separate and turn around their own axis
    ALIGNMENT_FACTOR = 1.3,
    COHESION_FACTOR = 1.0;//0.8(m) - 1.5(c)

//constructor
function Boid(pos, vel, boidData, channelIndices, freqBandIndices){ //position and velocity
    this.position = pos || new Vector(); //Center of the boid (vector)
	this.velocity = vel || new Vector(); //Velocity (vector)
    this.boidData = boidData || new BoidData();
    this.BOID_COLOUR = this.boidData.getColour();
    this.BOID_POINTS = "-" + (BOID_LENGTH / 2) + ",-" + (BOID_WIDTH / 2) + " "
        + "-" + (BOID_LENGTH / 2) + "," + (BOID_WIDTH / 2) + " "
        + (BOID_LENGTH / 2) + ",0";
    // NOT USED
    this.channelIndices = channelIndices; //selected channel indices
    this.freqBandIndices = freqBandIndices; //selected frequency band indices

}

Boid.prototype.getPoints = function(){
    return this.BOID_POINTS;
};

Boid.prototype.getColour = function(){
  return this.BOID_COLOUR;
};

Boid.prototype.getPosition = function(){
    return this.position;
};

/**
 * Return the boids changed position and rotation.
 * @returns {string}
 */
Boid.prototype.transform = function(){
    return "translate(" + this.position.x +", " + this.position.y + ")"
        + " rotate(" + this.angle() + ") "; //rotate, then translate! -> so no rotation center needed
        //last comes first! 1) rotate, 2) translate
};

/**
 * Change Boid's orientation.
 * @returns {number}
 */
Boid.prototype.angle = function(){
  //return angle in degrees
    return Math.atan2(this.velocity.y, this.velocity.x) / Math.PI * 180; //Degrees = radians * (180/PI)
    //atan2([x,y]) returns angle in radians
};

/**
 * Move the boid.
 */
Boid.prototype.move = function(){
    this.position = this.position.add(this.velocity);
    if(this.position.x >= AREA_WIDTH)
        this.position.x = 0;
    else if(this.position.x <= 0)
        this.position.x = AREA_WIDTH-5;
    if(this.position.y >= AREA_HEIGHT)
        this.position.y = 0;
    else if(this.position.y <= 0)
        this.position.y = AREA_HEIGHT-5;
};

Boid.prototype.changeColour = function(){
    this.BOID_COLOUR = this.boidData.getColour();
    return this.BOID_COLOUR;
};

/**
 * Calculate boid's alignment.
 * @param otherBoids
 */
Boid.prototype.align =
    function (otherBoids) {
      var steer = new Vector(),
      //Nachbarn finden, die näher an aktuellem Boid als NEIGHBOR_DISTANCE
        neighbors = this.neighbors(otherBoids, NEIGHBOR_DISTANCE),
        count = neighbors.length;
      //Geschwindigkeitsvektoren aller Nachbarn addieren
      neighbors.forEach( function (neighbor) {
       steer = steer.add(neighbor.velocity);
      });
      if (count > 0) 
        steer = steer.mult(1 / count);
      return this.computeAcceleration(steer);
};

/**
 * Calculate separation to neighbours.
 * @param otherBoids
 */
Boid.prototype.separate =
    function(otherBoids){
      var steer = new Vector(),
        neighbors = this.neighbors(otherBoids, this.boidData.getDesiredSeparation()),
        count = neighbors.length,
        orig_pos = this.position;

      neighbors.forEach( function (neighbor) {
        //Vektor berechnen, der vom Nachbarn zum aktuellen Boid zeigt
        // + auf die Länge normalisiert ist, die dem umgekehrten Abstand vom Nachbarn entspricht
        var acc = orig_pos.sub(neighbor.position);
        steer = steer.add(acc.normalize( 1 / acc.magnitude() ));
      });
      if (count > 0)
        steer = steer.mult(1 / count);
      return this.computeAcceleration(steer);

};

/**
 *
 * @param otherBoids
 */
Boid.prototype.cohere =
    function(otherBoids){
      var steer = new Vector(),
        neighbors = this.neighbors(otherBoids, NEIGHBOR_DISTANCE),
        count = neighbors.length,
        orig_pos = this.position;

      neighbors.forEach( function (neighbor) {
        //Vektor berechnen, der vom aktuellen Boid zum Nachbarn zeigt
        //und zu steer addiert
        steer = steer.add(neighbor.position.sub(orig_pos));
      });
      if (count > 0)
        steer = steer.mult(1 / count);
      return this.computeAcceleration(steer);
};

/**
 * Figure out which of the flock's members are neighbours.
 * @param otherBoids
 * @param neigh_dist
 * @returns {Array}
 */
Boid.prototype.neighbors = 
    function(otherBoids, neigh_dist){
      var neighbors = [], distance = new Vector();
      for(i = 0; i < otherBoids.length; i++){
        //calculate distance between this boid and otherboids
        distance = this.position.sub(otherBoids[i].position);
        if(distance.magnitude() > 0 && distance.magnitude() < neigh_dist)
            neighbors.push(otherBoids[i]); //dann füge diesen Boid als Nachbarn hinzu
      }
      return neighbors;
};

Boid.prototype.computeAcceleration = function(w_velocity){
      //(i) normalize w_velocity
      w_velocity = w_velocity.normalize(this.boidData.getNormalSpeed());
      //calculate acceleration vector that needs to be added to momentary velocity to get w_velocity
      var acceleration = w_velocity.sub(this.velocity);
      //(ii) norm of acceleration vector is limited to MAX_FORCE
      return acceleration.limit(MAX_FORCE);
};

Boid.prototype.accelerate = function(acceleration){
      n_vel = this.velocity.add(acceleration);
      var max_speed = this.boidData.getMaxSpeed();
      this.velocity = (n_vel.magnitude() < max_speed) ? n_vel : n_vel.limit(max_speed);
};


Boid.prototype.flock = function (otherBoids) {
      var separation = this.separate(otherBoids)
                           .mult(SEPARATION_FACTOR),
          alignment = this.align(otherBoids)
                           .mult(ALIGNMENT_FACTOR),
          cohesion = this.cohere(otherBoids)
                           .mult(COHESION_FACTOR);
      this.accelerate(separation.add(alignment).add(cohesion));
};
