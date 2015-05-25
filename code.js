var NUMBER_OF_BOIDS = 80,
    AREA_WIDTH = 500,
    AREA_HEIGHT = 500;
var CONTAINER_WIDTH = AREA_WIDTH/10,
    CONTAINER_HEIGHT = AREA_HEIGHT/10;

var boids, allBoids;
var containers;
var svg;

var bar, rect, alpha_theta_rect;
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

var last_alpha_abs = [], last_theta_abs = [];
var alpha_theta_ratio = [1,1,1,1];

function init () {
    var i, p, checkbox, button, body, boidDiv;
    var alphaThetaRatio, chart; //svg rausgenommen
    var barWidth = 9.6;
    //AREA_WIDTH = window.innerWidth;

    body = d3.select("body");
    boidDiv = body.select(".boid-div");
    svg = boidDiv.append("svg");
    p = body.append("p").attr("class","running");
    button = p.append("input").attr({type: "submit", value: "Neustart"});
    button.on("click", newBoids);
    checkbox = p.append("input").attr({type: "checkbox", id: "running"});
    body.select(".running").append("span").text("Running");

    /************ Bar Graph FFT ****************/
    var xAxis = d3.svg.axis()
        .scale(x_scale)
        .orient("bottom")
        .ticks(15, "Hz");

    var yAxis = d3.svg.axis()
            .scale(y_scale)
        .orient("left")
        .ticks(10, "dB");

    chart = d3.select(".chart-svg")
        .append("g")
        .attr("class", "chart-group")
        .attr("transform","translate(40,20)");

    rect = chart.selectAll("rect")
            .data(fft_Fp1)
        .enter().append("rect")
            .attr("transform", function(d,i){ return "translate(" + i * barWidth + ", " + chartHeight + ") rotate(180)";})
            .attr("height", function(d) { return y_scale(d.value) + "px"; })
            .attr("width", barWidth - 1)
            .attr("class", function(d){ return d.class; });

    chart.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + chartHeight + ")")
        .call(xAxis);

    chart.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(-10,0)")
        .call(yAxis);

    /********************** Alpha/Theta Ratio ************************/

    alphaThetaRatio = d3.select(".alpha-theta-ratio-svg")
        .append("g")
        .attr("class", "alpha-theta-bar");

    alpha_theta_rect = alphaThetaRatio.selectAll("rect")
            .data(alpha_theta_ratio)
        .enter().append("rect")
            .style("fill", "red")
            .attr("height", function(d) { return d*30 + "px"; })
            .attr("width","45px")
            .attr("transform", function(d,i){ return "translate(" + (i+1)* 50 + ", " + 150 + ") rotate(180)";});


    svg.attr({ width: AREA_WIDTH, height: AREA_HEIGHT })
        .style("background", "black");

    //Add Boid Objects to boid array
    var constants = new Constants();
    boids = [];
    for(var j = 0; j < NUMBER_OF_BOIDS; j++){
        //var x = Math.floor( ( (Math.random()*(-1)) || (Math.random()) ) *100);
        //let boids face in random directions
        var x = Math.floor( (Math.random()*3) - 1.5) * 100;
        var y = Math.floor( (Math.random()*2) - 1) * 100;
        //var y = Math.floor((Math.random()*(-1))+10);
        // var y = Math.floor( ( (Math.random()*(-1)) || (Math.random()) ) *100 );
        boids.push(new Boid(new Vector(250, 150), new Vector( x, y ), constants ) );
        //boids.push(new Boid(new Vector(Math.floor((Math.random()*50)+200), Math.floor((Math.random()*20))+100), new Vector( x, y ) ) );
    }

    containers = [];
    var coor = [];
    var rowCont = [];
    for(var k = 0; k < 10; k++){//Y
        rowCont = [];
        for(var h = 0; h < 10; h++){//X
            coor = [h*CONTAINER_WIDTH,
                k*CONTAINER_HEIGHT,
                (h+1)*CONTAINER_WIDTH,
                (k+1)*CONTAINER_HEIGHT];
            rowCont.push(new Container(k, h, coor, false));
        }
        containers.push(rowCont);
    }

    containers.forEach(function(rowCont){
        rowCont.forEach(function(el){
            addNeighbours(el, containers);
        });
    });

    containers[3][2].setContainsBoids(true);
    containers[3][2].setBoids(boids);

    allBoids = svg.selectAll("polygon")
        .data(boids)
        .enter()
        .append("polygon")
        .attr( { points: function(boid){ return boid.getPoints();},
            fill: function(boid){ return boid.getColour();} } );

    draw();

//Todo: think of a way that we can communicate between containers (when a boid changes container)
    //maybe with a ContainerController
    setInterval(
        function(){
            if(running()){
                for(i = 0; i < boids.length; i++){
                    boids[i].flock(boids);
                    boids[i].move();
                    boids[i].changeColour();
                }
                draw();
                update_bargraph();
                update_theta_alpha_display();
            }
        }, 5);

    var concentrationValues = [],
        mellowValues = [];

    var socket = io('http://localhost/');
    socket.on('news', function (data) {
        console.log(data);
        socket.emit('my other event', { my: 'data' });
    });
    socket.on('osc', function(data){
        var path = data.osc[0];
        if(data.hasOwnProperty("osc")){
            //switch is way faster than if else!
            switch(path){
                case "/muse/elements/experimental/concentration":
                    concentration(data, constants);
                    break;
                case "/muse/elements/experimental/mellow":
                    mellow(data, constants);
                    break;
                /*
                 * Absolute band powers are based on the logarithm of the Power Spectral Density of the EEG data for each channel.
                 * Since it is a logarithm, some of the values will be negative (i.e. when the absolute power is less than 1)
                 * They are given on a log scale, units are Bels. These values are emitted at 10Hz.
                 * Source: https://sites.google.com/a/interaxon.ca/muse-developer-site/museio/osc-paths/osc-paths---v3-6-0#TOC-Absolute-Band-Powers
                 */
                /*case "/muse/elements/delta_absolute":
                    frequencyBandsAbsolute(data, "delta_absolute", constants);
                    break;*/
                case "/muse/elements/theta_absolute":
                    frequencyBandsAbsolute(data, "theta_absolute", constants);
                    break;
                case "/muse/elements/alpha_absolute":
                    frequencyBandsAbsolute(data, "alpha_absolute", constants);
                    break;
               /* case "/muse/elements/beta_absolute":
                    frequencyBandsAbsolute(data, "beta_absolute", constants);
                    break;
                case "/muse/elements/gamma_absolute":
                    frequencyBandsAbsolute(data, "gamma_absolute", constants);
                    break;*/
                //relative band powers, e.g. relative_alpha = (alpha_absolute / (alpha_absolute + beta_absolute + delta_absolute + gamma_absolute + theta_absolute))
                //values between 0 and 1, but never 0 or 1 exactly.
                //source:https://sites.google.com/a/interaxon.ca/muse-developer-site/museio/osc-paths/osc-paths---v3-6-0#TOC-Relative-Band-Powers
                /*case "/muse/elements/delta_relative":
                 frequencyBandsRelative(data, "delta_relative");
                 break;
                 case "/muse/elements/theta_relative":
                 frequencyBandsRelative(data, "theta_relative");
                 break;
                 case "/muse/elements/alpha_relative":
                 frequencyBandsRelative(data, "alpha_relative");
                 break;
                 case "/muse/elements/beta_relative":
                 frequencyBandsRelative(data, "beta_relative");
                 break;
                 case "/muse/elements/gamma_relative":
                 frequencyBandsRelative(data, "gamma_relative");
                 break;
                 */
                /*** Raw FFT ****/
                case "/muse/elements/raw_fft0":
                    //update_bargraph(data);
                    update_fft_data(data);
                    //raw_fft(data, "T9", constants);
                    break;
                case "/muse/elements/raw_fft1":
                    //raw_fft(data, "Fp1", constants);
                    break;
                case "/muse/elements/raw_fft2":
                    //raw_fft(data, "Fp2", constants);
                    break;
                case "/muse/elements/raw_fft3":
                   // raw_fft(data, "T10", constants);
                    break;
            }
        }


    });
}

function update_theta_alpha_display(){
    alpha_theta_rect.data(alpha_theta_ratio);
    alpha_theta_rect.attr("height", function(d) { return d*30 + "px"; });
}

function update_bargraph(){
    rect.data(fft_Fp1);
    rect.attr("height", function(d,i){
        if(typeof d.value === "number"){
            return chartHeight - y_scale(d.value) + "px";
        }
    });
}

function update_fft_data(data){
    var d = data.osc.slice(1,81);
    for(var j = 0; j < fft_Fp1.length; j++){
        fft_Fp1[j].value = d[j];
    }
}

function addNeighbours(container, containers){
    var r = container.getRow();
    var c = container.getCol();
    for(var j = -1; j < 2; j++){
        for(var i = -1; i < 2; i++){
            if(i !== 0 || j !== 0)
                container.addNeighbour(findNeighbourInContainers(containers,r+j, c+i ));
        }
    }
}
//Todo: make 2d
function findNeighbourInContainers(containers, r, c){
    var n = null;
    if(r >= 0 && c >= 0 && r < 10 && c < 10) {
        n = containers[r][c];
    }
    return n;
}


//index 1 of data.osc is concentration / mellow value (0 if muse is off head)
function concentration(data, constants){
    //console.log("concentration: " + data.osc[1]);
    constants.setConcentration(data.osc[1]);
}

function mellow(data, constants){
    //console.log("mellow: " + data.osc[1]);
    constants.setMellow(data.osc[1]);
}

function frequencyBandsAbsolute(data, band, constants){
    var printFreq = band + ":\t";
    var printAlphaTheta = "Alpha/Theta: ";
    var bandPowers = [];
    for (var i = 1; i < data.osc.length; i++){
        bandPowers[i-1] = Math.pow(10, data.osc[i]);
        if ( band === "alpha_absolute" ){
            last_alpha_abs[i-1] =  bandPowers[i-1];
            alpha_theta_ratio[i-1] = bandPowers[i-1]/last_theta_abs[i-1];
            printAlphaTheta += alpha_theta_ratio[i-1] + "\t";

        }else if ( band === "theta_absolute" ){
            last_theta_abs[i-1] =  bandPowers[i-1];
            alpha_theta_ratio[i-1] = last_alpha_abs[i-1]/bandPowers[i-1];
            printAlphaTheta += alpha_theta_ratio[i-1] + "\t";
        }
        printFreq += bandPowers[i] + '\t';
    }
    constants.setThetaAlphaRatio(alpha_theta_ratio);
    if ( band === "alpha_absolute" || band === "theta_absolute" ){
        //console.log(printAlphaTheta);
    }
    //console.log(printFreq);
}

function frequencyBandsRelative(data, band){
    var printFreq = band + ":\t";
    for(i = 1; i < data.osc.length; i++){
        printFreq += data.osc[i] + '\t';
    }
    console.log(printFreq);
}

function raw_fft(data, channel, constants){
    console.log("FFT for channel " + channel + ":");
    for(i = 1; i < data.osc.length; i++){
        console.log((i-1)*0.86 + "Hz: " + data.osc[i]);
    }
}

function running () {
    return document.getElementById("running").checked
}

function newBoids () {
    angles = [];//angles that define the rotation of every boid
    for(i = 0; i < boids.length; i++){
        angles[i] = Math.atan2(boids[i].velocity.y, boids[i].velocity.x) * (180/Math.PI); //Degrees = radians * (180/PI)
        //atan2([y,x]) returns angle in radians
        //Tan(phi) = Gegenkathete / Ankathete
        //-> Phi (radiant) = arctan2(y/x) (vorzeichenrichtiger acrtan)
    }
}

function draw(){
    allBoids.attr('transform', function(boid){ return boid.transform() })
        .attr('fill', function(boid){ return boid.getColour() });
}


