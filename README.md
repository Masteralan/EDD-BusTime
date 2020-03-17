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
If you are not looking for running the actual tracker, you may skip this step.

Our code was programmed to work with a BU-353S4 USB GPS Receiver. To get this working, plug it into your device on Linux and run this setup:
`$ sudo apt-get install gpsd gpsd-clients`
`$ sudo apt-get update`

To start the GPS tracker itself, run:
`$ gpsd -b /dev/ttyUSB0`
With this, it should begin to run on port 2947.

If you are running this on Windows, it may be better to use [this documentation](https://www.globalsat.com.tw/ftp/download/GMouse_Win_UsersGuide-V1.0.pdf) instead.

### Running
All scripts should be run from the main directory (EDD-BusTime).

Run the server with `$ node Server/ServerBase.js`
Run the bus tracker script with `$ node Tracker/Tracker.js`

You can test the client by hosting a server and then connecting to `localhost:8443` within a web browser.