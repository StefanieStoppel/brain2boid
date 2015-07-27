/**
 * This class was supposed to be used for the flocking algorithm optimisation. Due to lack of time
 * and other priorities, the development on it came to a halt.
 */


function Container(row, col, coordinates, containsBoids, neighbours, boids){
    this.row = row;
    this.col = col;
    this.coordinates = coordinates;//form: array(x_min, y_min, x_max, y_max)
    this.containsBoids = containsBoids || false;
    this.neighbours = neighbours || [];
    this.boids = boids || [];
}


Container.prototype.setContainsBoids = function(containsBoids){
    this.containsBoids = containsBoids;
};

Container.prototype.getContainsBoids = function(containsBoids){
    return this.containsBoids;
};

Container.prototype.getBoids = function(){
    return this.boids;
};

Container.prototype.setBoids = function(boids){
    if(boids.constructor === Array)
        this.boids = boids;
};

Container.prototype.addBoid = function(boid){
    var ins = this;
    if (boid.constructor === Boid){
        ins.boids.push(boid);
    }else if (boid.constructor === Array){
        boid.forEach(function(entry){
            ins.boids.push(entry);
        });
    }
};

Container.prototype.removeBoid = function(){
    //random Boid gets removed
    return this.boids.splice(Math.floor(Math.random() * this.boids.length), 1);
};

Container.prototype.addNeighbour = function(neighbour){
    if(neighbour === null || neighbour.constructor === Container )
        this.neighbours.push(neighbour);
};

Container.prototype.getNeighbours = function(){
    return this.neighbours;
};

Container.prototype.getRow = function(){
    return this.row;
};

Container.prototype.getCol = function(){
    return this.col;
};

Container.prototype.getXMin = function(){
    return this.coordinates[0];
};

Container.prototype.getYMin = function(){
    return this.coordinates[1];
};

Container.prototype.getXMax = function(){
    return this.coordinates[2];
};

Container.prototype.getYMax = function(){
    return this.coordinates[3];
};