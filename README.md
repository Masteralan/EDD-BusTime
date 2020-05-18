# Bus Time

A tracking system for buses to help keep transportation staff and school students more informed on bus locations and timing.

## Systems
### Tracker
Consists of Rapsberry Pi with GPS module. Sends data packets to server over GPS location of bus, server processes info.

### Server
Holds data and processes information and requests from both trackers and clients.
Data sent to client should not include actual bus locations for security.

### Client
Web page for client to interact with and view information.



## Setup
Note that the steps described in this setup are written for Debian distributions of Linux, and are not garunteed to work on the server.

### NPM Package List
To run these JS programs, you need to install node JS and npm (`$ sudo apt install npm`).
You should be able to install the packages using `$ npm install` once, but if not, here are the packages you should need.

These are the packages used (you can install all of them with `$ npm install express body-parser request net`):
- express
- body-parser
- request
- net

### SSL Keys
To run the server, you need to generate keys using openssl, and then place them into a direction call EncryptionKeyTests.
`$openssl req -nodes -new -x509 -keyout key.pem -out cert.pem`

### GPS Tracker (Optional)
If you are not looking for running the actual tracker, you may skip this step. This step is exlusive to Linux and does not run on operating systems like Windows.

Our code was programmed to work with a BU-353S4 USB GPS Receiver. To get this working, plug it into your device on Linux and run this setup:
`$ sudo apt-get install gpsd`
`$ sudo apt-get update`

To start the GPS tracker itself, run:
`$ gpsd -N -n -b /dev/ttyUSB0`
With this, it should begin to run on port 2947.

You can then run the bus tracker with the command `$ node Tracker/Tracker.js`, and the application will begin to pipe GPS coordinates outputted by gpsd into itself for processing and for sending over the network.

### Running
All scripts should be run from the main directory (EDD-BusTime).

Run the server with `$ node Server/ServerBase.js`
Run the bus tracker script with `$ node Tracker/Tracker.js`

You can test the client by hosting a server and then connecting to `localhost:8443` within a web browser.

## Client Login
Once the server is hosted, clients merely need to go to the server address with the port number 8443 to be redirect to the login page.
Here, they can type in a username or password from the list of logins under the Server folder, and they will be able to log in and view information the server provides.