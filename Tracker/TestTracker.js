// Should send packets to server

// Created with help of my brother, basis pulled off from https://github.com/Maxattax97/sample-nodejs-host-client

const request = require("request");
const net = require('net');

// Starting position of tester 'bus'
const startLat = 39.991737;
const startLong = -86.221717; 

const loc1 = 39.998863; // First position tester reaches for changing direction (latitude)
const loc2 = -86.238940;

let i = 0;

const iDivision = 3000;
const iOffset1 = (loc1 - startLat) / (1 / iDivision);
const iOffset2 = (loc2 - startLong) / (1 / iDivision) + iOffset1;

const trackerInfo = require("./TrackerInfo.json");

let ContinueTracking = true;

// Sends a data packet to server
function SendPacket(obj) {
    request.post({
        url: "https://127.0.0.1:8443/api/gps",
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

setInterval(() => {
    let offsetLat = startLat;
    let offsetLong = startLong;

    offsetLat = Math.min(startLat + i / iDivision, loc1);
    if (offsetLat >= loc1) {
        offsetLong = Math.max(startLong - (i - iOffset1) / iDivision, loc2);
        console.log(" On second straight");
    }
    if (offsetLong <= loc2) {
        offsetLat += 0.3 * (i - iOffset2) / iDivision;
        offsetLong -= 0.31 * (i - iOffset2) / iDivision;
        console.log(" On road");
    }

    const message = {
        lat: offsetLat,
        long: offsetLong,
        speed: 0,
        busNumber: trackerInfo.BusNumber,
        time: Date.now()
    };
    
    console.log('Location is ', message.lat, ', ', message.long);
    SendPacket(message);
    i++;
    
    if (!ContinueTracking) {
        clearInterval();
    }
}, 1000);