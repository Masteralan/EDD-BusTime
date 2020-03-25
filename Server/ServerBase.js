// Created with help of my brother, basis pulled off from https://github.com/Maxattax97/sample-nodejs-host-client
// Takes and interprets packets from modules and clients

// from EDDBusTracker: $ node ./Server/ServerBase.js
// connect to https:/localhost:8443 from browser

// Load in required Node Modules
const fs = require("fs");
const https = require("https");
const express = require("express");
const parser = require("body-parser");
const BusData = require("./BusData.js");    // Load in data handling module
const Logins = require("./Logins.json");    // Load in log-in info

// Load in HTML data from login page and route display
// Loads these in ahead of time so we don't have to face overhead from loading them in later
// Note - Editing these pages requires a restart of the server
const loginPage = fs.readFileSync("Client/login.html", "utf8");
const webPage = fs.readFileSync("Client/route_display.html", "utf8");

// Create a Network application
const app = express();
app.use(parser.urlencoded({extended:false}));
app.use(parser.json());

let IsTracking = true;

// Bus Trackers should make GPS post requests to this location
app.post("/api/gps", (req, res) => {
    console.log("Recieved GPS input");
    
    // Store the given data
    BusData.StorePoint(req.body);

    // Respond by telling the tracker to keep sending data (or to be done)
    res.send(IsTracking);
});


// Session Management //
// Random characters for string generation
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const Sessions = [];

// Confirm user's identity and locate bus number they use--returns -1 if they are not in the system
function ConfirmIdentity(username, password) {
    for (let i = 0; i < Logins.length; i++) {
        if (username == Logins[i].username && password == Logins[i].password) {
            return Logins[i].busNumber;
        }
    }
    
    return -1;
}
function ConfirmSession(session) {
    for (let i = 0; i < Sessions.length; i++) {
        // If the session is older than 30 minutes, remove it
        if (Date.now() - Sessions[i].Time > 1800000) {
            Sessions.splice(i, 1);  // Remove session from array
            i--;
            continue;
        }

        if (session == Sessions[i].Key) {
            return Sessions[i].Bus;
        }
    }
    
    return -1;
}
// Generates a "session" for the user that can be used to validate requests for further information
// This way, the login is sent minimally between client and server
function GenerateSession(busNumber) {
    let result = '';
    
    var charactersLength = characters.length;
    for ( var i = 0; i < 10; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    const session = {
        Bus: busNumber,
        Key: result + new Date().toISOString(),
        Time: Date.now()
    }

    Sessions.push(session);

    return session.Key;
}


// Web Application //


// Typical browser-access, send them web-page info (this is the login page)
app.all("/login", (req, res) => {
    console.log("Displaying login to request", req.body);
    res.send(loginPage);
});
// If someone attempts to enter the main page...
app.all("/", (req, res) => {
    console.log("On webpage, recieved login request", req.body);

    // If this is a basic page load-in, redirect them to login
    if (!req.body.username || !req.body.password)
        res.redirect("/login");
    else {  // If there was a login....

        var id = ConfirmIdentity(req.body.username, req.body.password);
        // If client has a bus number, then send them main-page info
        if (id !== -1) {
            console.log("Login succeeded!");
            const session = GenerateSession(id);
            // Fills out HTML page with client's basic information
            var pageData = webPage.replace("%BUSNUMBER",id).replace("%SESSION", session);

            // Systematically build the stop-list on the web-page in generated HTML
            // - makes code easier and faster on client-side, and enforces that client only views information server can provide
            var routeList = "";
            var stops = BusData.GetBusData(id);
            if (stops) {
                stops = stops.Stops;
                for (var i = 0; i < stops.length; i++) {
                    if (stops[i]) {
                        routeList += "<div class=\"route_info\" id=\"Stop" + stops[i].Address + "\">";
                        routeList += "<h2>" + stops[i].Address + "</h2>";
                        routeList += "<div class=\"route_info_scheduled\">Scheduled for " + stops[i].TimeScheduled + "</div>";
                        routeList += "<div class=\"route_info_timing\" id=\"Stop" + stops[i].Address + "Estimate\">No estimate at this time";
                        routeList += "</div></div>";
                    }
                }
            }

            res.send(pageData.replace("%ROUTE_INFO",routeList));

        } else   // If the login failed, deny the client and boot them back to login panel
            res.redirect("/login?failed");
    }
});
// Reply to estimation requests by confirming identity (currently, send raw data)
app.post("/get-estimate", (req, res) => {
    // Get bus number of client
    num = ConfirmSession(req.body.key);
    console.log("Received get estimate request from user " + num + " with body ", req.body);

    // If the bus number is valid, send them the updated route info
    if (num !== -1) {
        // Strip off sensitive position data from stops before sending
        var routeList = JSON.parse(JSON.stringify(BusData.GetBusData(num).Stops));
        for (var i = 0; i < routeList.length; i++) {
            if (routeList[i]) {
                routeList[i].Position = "";
                routeList[i].Speeds = "";
            }
        }

        res.send({Stops: routeList, BusNumber: num, Timestamp: Date.now()});
    } else  // Otherwise, reject their request
        res.redirect("/login?expired");
});


// To generate new keys: openssl req -nodes -new -x509 -keyout key.pem -out cert.pem
https.createServer({
    key: fs.readFileSync("EncryptionKeyTests/key.pem"),
    cert: fs.readFileSync("EncryptionKeyTests/cert.pem"),
}, app).listen(8443);

console.log("HTTPS on 8443");