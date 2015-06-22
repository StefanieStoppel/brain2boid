
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
//muse experimental values
var MELLOW = 0,
    CONCENTRATION = 0;
//var colours = ['white', 'red', 'green', 'orange', 'aqua', 'chartreuse', 'darkmagenta', 'deeppink', 'blue', 'yellow', 'coral', 'deepskyblue', 'fuchsia', 
 //  'gold', 'indigo', 'lawngreen', 'lightyellow', 'olivedrab', 'purple', 'yellowgreen', 'seagreen', 'darkred'];

//constructor
function Boid(pos, vel, constants, channelIndices, freqBandIndices){ //position and velocity
    this.position = pos || new Vector(); //Center of the boid (vector)
	this.velocity = vel || new Vector(); //Velocity (vector)
    this.constants = constants || new Constants();
    this.BOID_COLOUR = this.constants.getColour();
    this.channelIndices = channelIndices; //selected channel indices
    this.freqBandIndices = freqBandIndices; //selected frequency band indices
    //Boids als (anfangs) nach rechts gerichtetes, gleichschenkliges Dreieck
    //soz. statische Property
    this.BOID_POINTS = "-" + (BOID_LENGTH / 2) + ",-" + (BOID_WIDTH / 2) + " " //linke untere Ecke des Boids
        + "-" + (BOID_LENGTH / 2) + "," + (BOID_WIDTH / 2) + " " //rechte untere Ecke des Boids
        + (BOID_LENGTH / 2) + ",0"; //Spitze des Boids
}

Boid.prototype.getPoints = function(){
    return this.BOID_POINTS;
};

Boid.prototype.setContainer = function(container){
    if(typeof container === Container)
        this.container = container;
};

Boid.prototype.getColour = function(){
  return this.BOID_COLOUR;
};

Boid.prototype.getPosition = function(){
    return this.position;
};
//get position as array for drawing path
Boid.prototype.getPositionArray = function(){
    return [this.position.x, this.position.y];
};

Boid.prototype.transform = function(){
    return "translate(" + this.position.x +", " + this.position.y + ")"
        + " rotate(" + this.angle() + ") " + this.constants.getBoidSizeScale(); //rotate, then translate! -> so no rotation center needed
        //last comes first! 1) rotate, 2) translate
};

Boid.prototype.angle = function(){
  //return angle in degrees
    return Math.atan2(this.velocity.y, this.velocity.x) / Math.PI * 180; //Degrees = radians * (180/PI)
    //atan2([x,y]) returns angle in radians
};

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
    this.BOID_COLOUR = this.constants.getColour();
    return this.BOID_COLOUR;
};

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

Boid.prototype.separate =
    function(otherBoids){
      var steer = new Vector(),
        neighbors = this.neighbors(otherBoids, this.constants.getDesiredSeparation()),
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

Boid.prototype.neighbors = 
    function(otherBoids, neigh_dist){
      var neighbors = [], distance = new Vector();
      for(i = 0; i < otherBoids.length; i++){
        //Distanz zwischen aktuellem Boid und allen anderen Boids berechnen
        distance = this.position.sub(otherBoids[i].position);
        //distance.x = Math.abs(distance.x);
        //distance.y = Math.abs(distance.y);
        //Ist die Distanz > 0 (also ungleich Boid self) oder kleiner der maximalen Distanz
        if(distance.magnitude() > 0 && distance.magnitude() < neigh_dist)
            neighbors.push(otherBoids[i]); //dann füge diesen Boid als Nachbarn hinzu
      }
      return neighbors;
};

Boid.prototype.computeAcceleration =
    function(w_velocity){
      //(i) normalize w_velocity (= gewünschte Geschwindigkeit)
      w_velocity = w_velocity.normalize(this.constants.getNormalSpeed());
      //calculate acceleration vector that needs to be added to momentary velocity to get w_velocity
      var acceleration = w_velocity.sub(this.velocity);
      //(ii) norm of acceleration vector is limited to MAX_FORCE
      return acceleration.limit(MAX_FORCE);
    };

Boid.prototype.accelerate =
    function(acceleration){
      n_vel = this.velocity.add(acceleration);
      var max_speed = this.constants.getMaxSpeed();
      //this.velocity = (acceleration.magnitude() < MAX_SPEED) ? acceleration : acceleration.normalize(MAX_SPEED);
      this.velocity = (n_vel.magnitude() < max_speed) ? n_vel : n_vel.limit(max_speed);
    };


Boid.prototype.flock =
    function (otherBoids) {
      var separation = this.separate(otherBoids)
                           .mult(SEPARATION_FACTOR),
          alignment = this.align(otherBoids)
                           .mult(ALIGNMENT_FACTOR),
          cohesion = this.cohere(otherBoids)
                           .mult(COHESION_FACTOR);
      this.accelerate(separation.add(alignment).add(cohesion));
};
