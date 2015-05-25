// constructor
function Vector(x, y) {
  this.x = x || 0; //sodass man den Nullvektor zurückbekommt, falls keine Werte übergeben
  this.y = y || 0;
}

//Speichereffizienz mit Prototype:
//-> deswegen werden Methoden den Prototypen zugeordnet und nicht dem Objekt selbst 
//durch Methoden im Konstruktor, denn sonst müsste für jeden einzelnen Vektor die Methoden neu erzeugt werden,
//durch Verwendung des Prototypen aber nur einmal füt alle Vektor Instanzen.

// length (i.e. norm) of the vector
Vector.prototype.magnitude =
  function () {
    // Pythagoras
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };

// skalar multiplication
Vector.prototype.mult =
  function (alpha) {
    return new Vector(alpha * this.x, alpha * this.y);
  };

// add another vector
Vector.prototype.add =
  function (vec) {
    return new Vector(vec.x + this.x, vec.y + this.y);
  };

// subtract another vector
Vector.prototype.sub =
  function (vec) {
    return new Vector(this.x - vec.x, this.y - vec.y);
  };

// return a vector with the same direction and length len
// (or 1, if len is not provided)
Vector.prototype.normalize =
  function (len) {
    len = len || 1;
    if (this.magnitude()) //hat der Vektor eine Länge ? -> damit wir nicht durch 0 teilen
      return this.mult(len / this.magnitude());
    else
      return new Vector(this.x, this.y);
  };

// return a vector with the same direction but norm at most limit
Vector.prototype.limit =
  function (limit) {
    if (this.magnitude() > limit)
      return this.mult(limit / this.magnitude());
    else
      return new Vector(this.x, this.y);
  };
