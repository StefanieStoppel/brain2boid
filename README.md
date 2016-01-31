#Brain2Boid
## An experimental Neurofeedback system

![Alt text](/readme-img/Screenshot-all-with-controls.jpg?raw=true "Web GUI of the Neurofeedback system")

***
**WARNING: This system is not a clinical neurofeedback system. DO NOT USE IT FOR ANY MEDICAL PURPOSES AND ESPECIALLY NOT IF YOU DON'T KNOW WHAT YOU'RE DEALING WITH! The responsibility for the physical and mental health of this software's user lies completely within his or her own hands. No responsibility is taken by the author of this software for any physical or mental harm resulting through the use of this neurofeedback system.**
***

### Introduction

This project is the result of my part practical, part theoretical bachelor thesis at the University of Applied Sciences Hamburg. 
The software is an EXPERIMENTAL! neurofeedback system, which was developed to work with the consumer EEG device [Muse(TM)](http://www.choosemuse.com/).

### What's the point of this neurofeedback system and experiment anyway?

What I wanted to find out during my bachelor thesis was, whether it was possible to see an "increase of control" over a person's own brain activity after a very short training session (5 minutes). 
All the books and papers i read claimed that one needed multiple Neurofeedback training sessions to improve the control over certain aspects of brain activity.
Since I didn't have enough time or ressources to test a lot of participants' improvement over a period of a few weeks and multiple sessions, I decided to try it with just a single one. Obviously this isn't up to the "scientific standard", but it was a fun experiment and topic and I enjoyed working with the Muse(TM) headband a lot!

### A little introduction to neurofeedback and a few tips

Neurofeedback is a procedure for showing a person "what's going on in their head". Before you think someone will be able to read your thoughts: it doesn't quite work that way ;)
During a Neurofeedback session an EEG device is placed on your head, which records your brain's electrical activity. This electrical activity is the result of the communication between your brain cells, also called neurons. The electrical activity is in the range of µV - so very, very small and hard to measure. This means that the EEG device's signals are easily disturbed by so-called "noise" - unwanted signal parts that interfere and pollute the original measurements. There is ways of dealing with this, but since I don't want to write my whole bachelor thesis in the form of a README file again, I'll just give you one important tip:

> You should sit as still as possible and try not to move your facial muscles too much while doing neurofeedback. 

As I said earlier, an EEG device can't read your thoughts, but what it can read is electrical activity. To be able to interpret the electrical brain activity, the signals are converted from the time to the frequency domain, normally utilising a certain kind of
Fourier Transform, the FFT (you can now take the time to look this one up, if you're interested in the mathematical details). All this stuff is thankfully already done by the Muse(TM) headband's firmware.
What is left over are the frequency contents of the signal, which are devided into the following *frequency bands* (in order from lowest to highest frequency):

* Delta
* Theta
* Alpha
* Beta
* Gamma

Each of these bands is more noticeable in different states of consciousness. The delta band for instance is most present when one is sleeping.

With Neurofeedback it is possible to train a person's "control" over one or more frequency bands by letting them know, when those frequency bands are present with a certain "strength". With enough training, the person can then - consciously or unconsciously - influence those frequency bands. This approach has been used for a few years for treating certain "disorders", that are often associated with brain activity that differs from the "average", if you can put it that way.
My Neurofeedback system is - as stated at the top - NOT intended for such uses. It is merely a system which shows that building a cheaper and more user friendly alternative to the clinical Neurofeedback systems in use today is and will be possible in the future, as technology
develops further. For now the Muse(TM) headband is not certified as a medical instrument and hence shouldn't be used for medical treatments in any way.

### Prerequisites for using the Neurofeedback system

To use this software, you first need to have [Node.js](https://nodejs.org/) installed on your system.
In addition to that, you need to download and install the [Muse SDK tools](http://developer.choosemuse.com/) into a directory on your computer. 
> Note that this software was developed on a Windows machine. There is NO guarantee that it will work the same way or at all
on other operating systems - haven't tested it, probably not going to either ;)
Also the system was tested and used with an older version of the Muse SDK Tools (Installer version 3.4.0),so I DON'T GUARANTEE that it will work as expected - or at all - with newer versions!

### First steps

There is different first steps depending on whether you're using a Muse(TM) headband or not.

#### Without a Muse(TM) headband

1a. For those of you who don't own a Muse(TM) headband, but still would like to try out the system, I made a few EEG recordings that you'll find in the *museplayer-scripts* directory. Run the batch script *museplayerOSCReplayToUdp5002.bat* in the same directory. The Muse SDK Tool called [MusePlayer](http://developer.choosemuse.com/research-tools/museplayer) will then start reading and
broadcasting the recording *test-file3* to UDP port 5002.

#### With a Muse(TM) headband

1b. If you own a Muse(TM) headband you should connect it to your computer via bluetooth as you're used to. When the connection is established, execute the batch script *50hzUdp5001Udp5002.bat* inside the *museio-shell-scripts* directory. Put the headband on.

### Make it work

2. Open the *index.html* file inside the project's root directory with a MODERN! web browser. 

> Definition of modern: if everything looks nice and stuff works, it's probably modern enough ;) Tested using Chrome 44 and 47 and Firefox 39.0.

3. Start the server-side part of the system by opening a command prompt (cmd) inside the *node* directory and executing `node main-controller.js`. If everything worked you should see `WebSocket connected...` printed in the console window.

4. Make sure you get a good connection by checking the quality indicators in the top left corner of your browser window - if they're coloured, it means you're getting a good signal and hence good data.

### Using the neurofeedback system

1. To start the *Neurofeedback Experiment*, create a new experiment session by clicking on the button in the bottom left corner of the browser window.
2. Type in your initials and age (or whatever...) and click *Submit*.

![Alt text](/readme-img/subject_dialog.JPG?raw=true "Experiment setup dialogue")
3. Now you can start the experiment by pressing the *Play button*.

### What do I have to do?

When you start the experiment, you will see a flock of triangles on the screen. The triangle's colour and movement speed indicate how well you're "controlling" your brain activity. If you're doing well, the triangles will get slower and turn blue.
The default frequency bands measured are alpha vs. beta. The goal is to increase the alpha-beta-ratio, ergo to increase the activity in the alpha band while at the same time decreasing activity in the beta band. 
I told my experiment subjects to relax and not to try too hard, but you should just go with the flow and do whatever works best for you.

The experiment consists of 4 parts:

* **Calibration**: Everybody's brainwaves are different. To establish your unique activity, the system will calibrate for 1 minute. Try to relax and sit as still as possible. Try to avoid talking, chewing or blinking rapidly - or any facial movements really.
The system will calculate a unique threshold that you have to reach to turn the triangles blue and to make them move slower.
* **Test 1**: After the calibration you can begin with the first test which will take one minute as well. Your task is to make the triangles turn blue for as long as possible. For this you will be awarded points which are displayed at the bottom of the screen in yellow.
* **Free neurofeedback**: This part will take 5 minutes. You should try to relax and just see whether you can come up with a strategy that works well for colouring the triangles blue. Don't worry if it seems random to you, it does to many. No points are awarded here.
* **Test 2**: The second test is essentially the same as the first one. Maybe you have come up with a strategy that works well for changing the triangles and you can try to earn more points this time. Don't pressure yourself though, as this can kind of counteract the whole process!

### And then what?

If everything worked and you made it through to the end, there should be a new file in the *csv* directory. This file shows you when you earned points for crossing your personal alpha-beta-threshold and you can see the amount of points you earned in test 1 and 2.
You can now try to change the threshold in the sidebar settings that open when you click the button with the arrow on the right hand side of the screen. You can also change the frequency bands you want to train and do the experiment again (after reloading the page!) or just watch what happens when you blink ;)

![Alt text](/readme-img/Sidebar1.JPG?raw=true "Settings sidebar")

### One last thing...

There is three branches (for now). Master is the main branch and offers the UI in English. develop-german hosts all the UI and info dialogues in German. develop is the main development branch (in English).

Enjoy!


Brain2Boid - an experimental neurofeedback system that works with the Muse(TM) headband.
Copyright (C) 2016  Stefanie Stoppel

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>
