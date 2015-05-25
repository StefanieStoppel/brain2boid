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
    AREA_HEIGHT = 500;

var HORSESHOE_DATA = [  {horseshoe: 3, cx: 40,  cy: 50, r:20, colour: "green"},
                        {horseshoe: 3, cx: 80,  cy: 50, r:20, colour: "blue"},
                        {horseshoe: 3, cx: 120, cy: 50, r:20, colour: "yellow"},
                        {horseshoe: 3, cx: 160, cy: 50, r:20, colour: "magenta"}];

function GraphicsController(selectedChannelIndices, selectedFreqIndices){
    /** BOIDS & CONSTANTS**/
    //TODO: node
    this.boids = [];
    this.constants = new Constants();

    //get selected channel(s) from radio buttons
    this.selectedChannelIndices = selectedChannelIndices;//array of numbers

    this.selectedFreqIndices = selectedFreqIndices;

    //todo: browser
    //append boidSvg field
    this.body = d3.select('body');
    this.boidSvg = this.body.select('.boid-container').append('svg');
    this.boidSvg.attr({ width: AREA_WIDTH, height: AREA_HEIGHT })
        .style("background", "black");

    //todo: node
    //init new boids
    this.newBoids(this.selectedChannelIndices);

    //todo browser
    //add boids to svg
    this.allBoids = this.boidSvg.selectAll("polygon")
        .data(this.boids)
        .enter()
        .append("polygon")
        .attr( { points: function(boid){ return boid.getPoints();},
            fill: function(boid){ return boid.getColour();} } );
    //draw boids
    this.draw();

    //todo browser
    //horseshoe display
    this.horseshoe = this.setupHorseshoe();

    //init restartButton and listen for clicks
    this.restartButton = this.body.select('#restart-btn');
    this.onResetBoids(this);

    //draw boids on svg every 5 ms
    this.updateBoidSvg();

    //initialize bar graph
    this.initBarGraph();

    //listen for window resize events
    //this.onWindowResize();
}

/**
 * Receive updated transform string for each boid and colour.
 * Called in UIController.onBoidUpdate()
 */
GraphicsController.prototype.drawBoids = function(data){
    //data.transforms = all transform strings as objects,
    //data.colour = boid colour
    this.boids = data.transforms;
    this.allBoids.data(this.boids);
    this.allBoids.attr('transform', function(d){ return d.transform })
        .attr('fill', data.colour);
} ;

GraphicsController.prototype.getConstants = function(){
    return this.constants;
};

GraphicsController.prototype.newBoids = function(channelSelection, freqBandSelection){
    //the number of boidGroups depends on selectedChannel
    //single ch: t9,t10,fp1,fp2; channel pairs: t9-fp1,fp1-fp2,t9-t10,t10-fp2
    //other: left-vs-right, all
    this.boids = [];
    this.addBoids(channelSelection, freqBandSelection);
};

//adds 50 boids with the specified channel and frequency band attribute
GraphicsController.prototype.addBoids = function(channelSelection, freqBandSelection){
    for(var j = 0; j < 50; j++){
        //random position within a certain area
        var x = Math.floor( Math.random()*150 + AREA_WIDTH/2);
        var y = Math.floor( Math.random()*150 + AREA_HEIGHT/2 );
        //let boids face in random directions
        var x_face = Math.floor( (Math.random()*3) - 1.5) * 100;
        var y_face = Math.floor( (Math.random()*2) - 1) * 100;
        this.boids.push(new Boid(new Vector(x, y), new Vector( x_face, y_face ), this.constants, channelSelection, freqBandSelection ) );
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
    self.newBoids(self.selectedChannelIndices, self.selectedFreqIndices);
    self.allBoids = d3.selectAll("polygon").data(this.boids)
        .attr( { points: function(boid){ return boid.getPoints();},
                 fill: function(boid){ return boid.getColour();} } );
    self.draw();
};

GraphicsController.prototype.resetBoids2 = function(self){
    self.newBoids(self.selectedChannelIndices, self.selectedFreqIndices);
    self.allBoids = d3.selectAll("polygon").data(this.boids)
        .attr( { points: function(boid){ return boid.getPoints();},
            fill: function(boid){ return boid.getColour();} } );
    self.draw();
};

/**
 * Calculate flocking and draw it on svg every 5 ms.
 */
GraphicsController.prototype.updateBoidSvg = function(){
    var self = this;
    setInterval(
        function(){
            if(running()){
                self.flock();
                self.draw();
            }
        }, 5);
};
/**
 * Flocking and changing colour.
 * @param scale
 */
GraphicsController.prototype.flock = function(scale){//scale == array with two values
    for(var i = 0; i < this.boids.length; i++){
        this.boids[i].flock(this.boids);
        this.boids[i].changeColour();
        this.boids[i].move();
        if(typeof scale !== 'undefined')
            this.boids[i].scale(scale);
    }
};

/**
 * Draw boids according to their transform string and fill them with a colour.
 * The colour depends on the trained band(s) ratio.
 */
GraphicsController.prototype.draw = function(){
    this.allBoids.attr('transform', function(boid){ return boid.transform() })
        .attr('fill', function(boid){ return boid.getColour() });
};


GraphicsController.prototype.initBarGraph = function(){
    /************ Bar Graph FFT ****************/
    var xAxis = d3.svg.axis()
        .scale(x_scale)
        .orient("bottom")
        .ticks(15, "Hz");

    var yAxis = d3.svg.axis()
        .scale(y_scale)
        .orient("left")
        .ticks(10, "dB");

    this.chart = d3.select(".chart-svg")
        .append("g")
        .attr("class", "chart-group")
        .attr("transform","translate(40,20)");

    var barWidth = 9.6;
    this.rect = this.chart.selectAll("rect")
        .data(fft_Fp1)
        .enter().append("rect")
        .attr("transform", function(d,i){ return "translate(" + i * barWidth + ", " + chartHeight + ") rotate(180)";})
        .attr("height", function(d) { return y_scale(d.value) + "px"; })
        .attr("width", barWidth - 1)
        .attr("class", function(d){ return d.class; });

    this.chart.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + chartHeight + ")")
        .call(xAxis);

    this.chart.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(-10,0)")
        .call(yAxis);

};

GraphicsController.prototype.update_bargraph = function(){
    this.rect.data(fft_Fp1);
    this.rect.attr("height", function(d,i){
        if(typeof d.value === "number"){
            return chartHeight - y_scale(d.value) + "px";
        }
    });
};

GraphicsController.prototype.update_fft_data = function(data){
    var d = data.osc.slice(1,81);
    for(var j = 0; j < fft_Fp1.length; j++){
        fft_Fp1[j].value = d[j];
    }
};

/*** NOT USED AT THE MOMENT ***/
GraphicsController.prototype.onWindowResize = function(){
    var self = this;
    $( window ).resize(function() {
        run(false);
        //change boid svg width
        AREA_WIDTH = $('html').outerWidth();
        self.boidSvg.attr({ width: AREA_WIDTH, height: AREA_HEIGHT })
        run(true);
    });

};

//horseshoe
// 3 || 4 = white circle; 2 = coloured outline; 1 = coloured circle
GraphicsController.prototype.setupHorseshoe = function(){
    return this.boidSvg.selectAll("circle")
        .data(HORSESHOE_DATA)
        .enter().append("circle")
        .attr("cx", function(d){ return d.cx; })
        .attr("cy", function(d){ return d.cy; })
        .attr("r", function(d){ return d.r; })
        .attr("fill" ,function(d){
            if(d.horseshoe === 3 || d.horseshoe === 2){
                return "white";
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
};

GraphicsController.prototype.updateHorseshoe = function(horseshoeValues){
    for(var i = 0; i < horseshoeValues.length; i++){
        HORSESHOE_DATA[i].horseshoe = horseshoeValues[i];
    }
    this.horseshoe.data(HORSESHOE_DATA);
    this.horseshoe.attr("fill" ,
        function(d){
            if(d.horseshoe === 3 || d.horseshoe === 2 || d.horseshoe === 4){
                return "white";
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

GraphicsController.prototype.getSelectedChannelIndices = function(){
    return this.selectedChannelIndices;
};

GraphicsController.prototype.setSelectedChannelIndices = function(selectedChannelIndices){
    this.selectedChannelIndices = selectedChannelIndices;
};

GraphicsController.prototype.getSelectedFreqIndices = function(){
    return this.selectedFreqIndices;
};

GraphicsController.prototype.setSelectedFreqIndices = function(selectedFreqIndices){
    this.selectedFreqIndices = selectedFreqIndices;
};


GraphicsController.prototype.getBoidController = function(){
    return this.boidController;
};

function running() {
    return document.getElementById('running').checked;
}

function run(bool){
    $('#running').attr('checked', bool);
}