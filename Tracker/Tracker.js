// Should send packets to server

// Created with help of my brother, basis pulled off from https://github.com/Maxattax97/sample-nodejs-host-client

const request = require("request");
const net = require('net');

const trackerInfo = require("./TrackerInfo.json");

let ContinueTracking = true;

// Sends a data packet to server
function SendPacket(obj) {
    request.post({
        url: "https://maxocull.com:8443/api/gps",
        method: "POST",
        json: true,
        body: obj,
        rejectUnauthorized: false,
    }, (err, res, body) => {
        if (err)
            console.error(err);
        else {
            if (!body)  // If the server says to stop tracking, then stop tracking
                ContinueTracking = false;
        }
    });
}

// Guide on BU-353S$ USB GPS Receiver https://www.globalsat.com.tw/ftp/download/GMouse_Win_UsersGuide-V1.0.pdf

// sudo systemctl status gpsd
// sudo systemctl stop gpsd gpsd.socket
// sudo systemctl disable gpsd gpsd.socket

// Run gpsd process and pipe data from it into process
// https://nodejs.org/api/stream.html
const child_process = require("child_process");
const ps = child_process.spawn("gpspipe", ["-w", "localhost:2947"]);
ps.stdout.on('data', function(data) {
    data = data.toString();
    //console.log(data);
    if (data.indexOf('"TPV"') == -1) return;   // Ignore non-GPS packets

    // If it is a GPS packet, parse it (note, this could error, may be dangerous)
    data = JSON.parse(data);

    const message = {
        lat: data.lat,
        long: data.lon,
        alt: data.alt,
        speed: data.speed,
        busNumber: trackerInfo.BusNumber,
        time: Date.parse(data.time)
    };

    // console.log('Sending packet to server ', message);
    SendPacket(message);

    if (!ContinueTracking) {
        ps.kill();
        clearInterval();
    }
});
ps.stdout.on('end', function() {
    ps.kill();
});