/**
 * This class controls all the svg graphics elements.
 * It controls the svg field and draws boids on it.
 * @constructor
 */
var chartWidth = 800, chartHeight = 350;
var y_scale = d3.scale.linear()
    .domain([-40, 30])
    .range([chartHeight, 0]);
var x_scale = d3.scale.linear()
    .domain([0, 81])
    .range([0,chartWidth]);
//FFT datasets (first only for one channel)
var fft_Fp1 = [];
for(var i = 0; i < 81; i++){
    // fft_Fp1.push(Math.random()*3);
    var r = Math.random()*60;
    if(r > 20)
        r = -(Math.random()*40);
    if(i == 0)
        fft_Fp1.push({value: r, class: "fft_0hz"});
    else if(i*0.86 > 0 && i*0.86 < 4.0)
        fft_Fp1.push({value: r, class: "fft_delta"});
    else if(i*0.86 >= 4.0 && i*0.86 < 8.0)
        fft_Fp1.push({value: r, class: "fft_theta"});
    else if(i*0.86 >= 8.0 && i*0.86 < 13.0)
        fft_Fp1.push({value: r, class: "fft_alpha"});
    else if(i*0.86 >= 13.0 && i*0.86 < 30.0)
        fft_Fp1.push({value: r, class: "fft_beta"});
    else if(i*0.86 >= 30.0 && i <= 80)
        fft_Fp1.push({value: r, class: "fft_gamma"});
}

var AREA_WIDTH = $('html').outerWidth(),
    AREA_HEIGHT = $('html').outerHeight() + 5;

var HORSESHOE_DATA = [  {horseshoe: 3, cx: 40,  cy: 50, r:20, colour: "orange",   opaque: false, channel: "T9"},
                        {horseshoe: 3, cx: 84,  cy: 50, r:20, colour: "green",    opaque: false, channel: "Fp1"},
                        {horseshoe: 3, cx: 128, cy: 50, r:20, colour: "#A4D5FF",  opaque: false, channel: "Fp2"},
                        {horseshoe: 3, cx: 172, cy: 50, r:20, colour: "magenta", opaque: false, channel: "T10"}];

var IS_GOOD_DATA = [ {isGood: 0, cx: 60, cy: 50, r: 8},
                     {isGood: 0, cx: 80, cy: 50, r: 8},
                     {isGood: 0, cx: 100, cy: 50, r: 8},
                     {isGood: 0, cx: 120, cy: 50, r: 8}];

function GraphicsController(){
    /** BOIDS & CONSTANTS**/
    this.boids = [];
    this.constants = new Constants();

    //append boidSvg field
    this.body = d3.select('body');
    this.boidSvg = this.body.select('#boid-svg');

    this.boidSvg.attr({ width: AREA_WIDTH, height: AREA_HEIGHT })
        .style("background", "black");

    //init new boids
    this.newBoids();

    //add boids to svg
    this.allBoids = this.boidSvg.selectAll("polygon")
        .data(this.boids)
        .enter()
        .append("polygon")
        .attr( { points: function(boid){ return boid.getPoints();},
            fill: function(boid){ return boid.getColour();} } );
    //draw boids
    this.draw();

    //ratios
    this.ratio = 0.5;
    this.trainingRatio = 0.5;

    //horseshoe display
    this.horseshoe = this.setupHorseshoe();
    //battery display
    this.setupBatteryDisplay();
    //setup is good indicator
    this.isGoodIndicator = this.setupIsGoodIndicator();

    //TODO: DOES THE BUTTON STILLE EXIST?
    //init restartButton and listen for clicks
    this.restartButton = this.body.select('#restart-btn');
    this.onResetBoids(this);

    //draw boids on svg every 5 ms
    this.updateBoidSvg();
}

GraphicsController.prototype.getConstants = function(){
    return this.constants;
};

GraphicsController.prototype.newBoids = function(){
    //the number of boidGroups depends on selectedChannel
    //single ch: t9,t10,fp1,fp2; channel pairs: t9-fp1,fp1-fp2,t9-t10,t10-fp2
    //other: left-vs-right, all
    this.boids = [];
    this.addBoids();
    this.mainBoid = this.boids[75];
};

//adds 50 boids with the specified channel and frequency band attribute
GraphicsController.prototype.addBoids = function(){
    for(var j = 0; j < 250; j++){
        //random position within a certain area
        var x = Math.floor( Math.random()*150 + AREA_WIDTH/2);
        var y = Math.floor( Math.random()*150 + AREA_HEIGHT/2 );
        //let boids face in random directions
        var x_face = Math.floor( (Math.random()*3) - 1.5) * 100;
        var y_face = Math.floor( (Math.random()*2) - 1) * 100;
        this.boids.push(new Boid(new Vector(x, y), new Vector( x_face, y_face ), this.constants ) );
    }
};

GraphicsController.prototype.getBoids = function(){
    return this.boids;
};

/**
 * Called when "Restart" button is clicked
 * @param self
 */
GraphicsController.prototype.onResetBoids = function(self){
    this.restartButton.on("click",  function(){
        if(!running()){
            self.resetBoids(self);
        }
    });
};

/**
 * Reset boid data and redraw boids in their initial position.
 * @param self
 */
GraphicsController.prototype.resetBoids = function(self){
    self.newBoids();
    self.allBoids = d3.selectAll("polygon").data(this.boids)
        .attr( { points: function(boid){ return boid.getPoints();},
                 fill: function(boid){ return boid.getColour();} } );
    self.draw();
};

/**
 * Calculate flocking and draw it on svg every 5 ms.
 */
    //TODO REFACTOR TO MAKE MORE EFIICIENT
GraphicsController.prototype.updateBoidSvg = function(){
    var self = this;
    setInterval(
        function(){
            if(running()){
                self.flock();
                self.draw();
            }
        }, 30);
};
/**
 * Flocking and changing colour.
 */
GraphicsController.prototype.flock = function(){
    for(var i = 0; i < this.boids.length; i++){
        this.boids[i].flock(this.boids);
        this.boids[i].changeColour();
        this.boids[i].move();
    }
};

/**
 * Draw boids according to their transform string and fill them with a colour.
 * The colour depends on the trained band(s) ratio.
 */
GraphicsController.prototype.draw = function(){
    this.allBoids.attr('transform', function(boid){ return boid.transform() })
        .attr('fill', function(boid){ return boid.getColour() })
        .style("opacity", this.constants.getBoidOpacity() );
};

//horseshoe
// 3 || 4 = white circle; 2 = coloured outline; 1 = coloured circle
GraphicsController.prototype.setupHorseshoe = function(){

    var circleGroup = this.boidSvg.selectAll("g")
        .data(HORSESHOE_DATA)
        .enter().append("g")
        .attr("transform", function(d){return "translate("+d.cx+"," + d.cy +")"});

    circleGroup.append("circle")
        .attr("r", function(d){ return d.r; })
        .attr("fill" ,function(d){
            if(d.horseshoe === 3 || d.horseshoe === 2){
                return "lavender";
            }else{
                return d.colour;
            }
        })
        .attr("stroke-width", 3)
        .attr("stroke", function(d){
            if(d.horseshoe === 2 || d.horseshoe == 1){
                return d.colour;
            }else if(d.horseshoe === 3){
                return "none";
            }
        });

    circleGroup.append("text")
        .attr("id", function(d){ return d.channel; })
        .attr("dx",
        function(d) {
            if(d.channel === "T9")
                return -10 ;
            else
                return -12;
        })
        .attr("dy", function(d){return 5})
        .text(function(d){return d.channel})
        .style("font-weight", "bold")
        .style("fill", "black")
        .style("stroke", "black");

    return circleGroup;
};

GraphicsController.prototype.updateHorseshoe = function(horseshoeValues){
    for(var i = 0; i < horseshoeValues.length; i++){
        HORSESHOE_DATA[i].horseshoe = horseshoeValues[i];
    }
    this.horseshoe.data(HORSESHOE_DATA);
    this.horseshoe.selectAll("circle").attr("fill" ,
            function(d){
                if(d.horseshoe === 3 || d.horseshoe === 2 || d.horseshoe === 4){
                    return "lavender";
                }else{
                    return d.colour;
                }
            })
        .attr("stroke-width", 2)
        .attr("stroke",
            function(d){
                if(d.horseshoe === 2 || d.horseshoe == 1){
                    return d.colour;
                }else if(d.horseshoe === 3  || d.horseshoe === 4){
                    return "none";
                }
            });
};

GraphicsController.prototype.setHorseshoeChannelOpaque = function(opaqueArray){
    for(var i = 0; i < opaqueArray.length; i++){
        HORSESHOE_DATA[i].opaque = opaqueArray[i].opaque;
    }
    this.horseshoe.data(HORSESHOE_DATA);
    this.horseshoe.selectAll("circle").style('opacity',
        function(d){
            if(d.opaque)
                return '0.2';
            else
                return '1';
        }
    );
};

GraphicsController.prototype.setupIsGoodIndicator = function(){

    var circles = d3.select("#is-good-indicator").selectAll("g")
        .data(IS_GOOD_DATA)
        .enter().append("g")
        .attr("transform", function(d){return "translate("+d.cx+"," + d.cy +")"});

    circles.append("circle")
        .attr("r", function(d){ return d.r; })
        .attr("fill" ,function(d){
            if(d.isGood === 0){
                return "white";
            }else{
                return "#042E57 ";
            }
        });

    return circles;
};

GraphicsController.prototype.updateIsGoodIndicator = function(isGoodValues){

    for(var i = 0; i < isGoodValues.length; i++){
        IS_GOOD_DATA[i].isGood = isGoodValues[i];
    }
    this.isGoodIndicator.data(IS_GOOD_DATA);
    this.isGoodIndicator.selectAll("circle").attr("fill" ,
        function(d){
            if(d.isGood === 0){
                return "white";
            }else{
                return "#042E57 ";
            }
        });
};

GraphicsController.prototype.setupBatteryDisplay = function(){
    this.batteryCharge = $('div#battery-charge');
    this.batteryChargeText = $('span#battery-charge-text');
    this.batteryChargeWidth = parseInt(this.batteryCharge.width());
};

GraphicsController.prototype.updateBatteryDisplay = function(charge){
    this.batteryCharge.width( (charge/100) * this.batteryChargeWidth );
    this.batteryChargeText.html(charge + '&#37;');
    if(charge < 10){
        this.batteryCharge.css('background-color', 'red');
    }
};

GraphicsController.prototype.getBoidSVG = function(){
    return this.boidSvg;
};

function running() {
    return document.getElementById('running').checked;
}

function run(bool){
    $('#running').prop('checked', bool);
}
