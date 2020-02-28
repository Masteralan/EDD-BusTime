// Should send packets to server

// Created with help of my brother, basis pulled off from https://github.com/Maxattax97/sample-nodejs-host-client

const modulesRoot = "../node_modules/";
const https = require("https");
const http = require("http");
const request = require("request");

const trackerInfo = require("./TrackerInfo.json");

var ContinueTracking = true;

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



function EstablishLoop() {
    // Periodically send message info
    setInterval(() => {
        const message = {
            lat: 0,
            long: 0,
            alt: 0,
            busNumber: trackerInfo.BusNumber,
            time: (new Date()).toISOString(),
        };

        console.log("Uploading data to server:", message);
        SendPacket(message);

        if (!ContinueTracking)
            clearInterval();
    }, 1000);
}

EstablishLoop();