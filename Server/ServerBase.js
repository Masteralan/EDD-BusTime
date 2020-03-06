// Created with help of my brother, basis pulled off from https://github.com/Maxattax97/sample-nodejs-host-client
// Takes and interprets packets from modules and clients

// from EDDBusTracker: $ node ./Server/ServerBase.js
// connect to https:/localhost:8443 from browser

// Load in required Node Modules
const fs = require("fs");
const https = require("https");
const http = require("http");
const express = require("express");
const parser = require("body-parser");
// Load in data handling module
const BusData = require("./BusData.js");

// Load in HTML data from login page and route display
// Loads these in ahead of time so we don't have to face overhead from loading them in later
// Note - Editing these pages requires a restart of the server
const loginPage = fs.readFileSync("Client/login.html", "utf8");
const webPage = fs.readFileSync("Client/route_display.html", "utf8");

// Create a Network application
const app = express();
app.use(parser.urlencoded({extended:false}));
app.use(parser.json());

var IsTracking = true;

// Bus Trackers should make GPS post requests to this location
app.post("/api/gps", (req, res) => {
    console.log("Recieved GPS input");
    
    // Store the given data
    BusData.StorePoint(req.body);

    // Respond by telling the tracker to keep sending data (or to be done)
    res.send(IsTracking);
});


// Web Application //

// Confirm user's identity and locate bus number they use--returns -1 if they are not in the system
function ConfirmIdentity(username, password) {
    if (username == "admin" && password == "password")
        return 10;
    else
        return -1;
}


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
            // Fills out HTML page with client's basic information
            var pageData = webPage.replace("%BUSNUMBER",id).replace("%USERNAME", req.body.username).replace("%PASSWORD",req.body.password);

            // Systematically build the stop-list on the web-page in generated HTML
            // - makes code easier and faster on client-side, and enforces that client only views information server can provide
            var routeList = "";
            var stops = BusData.GetBusData(id);
            if (stops) {
                stops = stops.Stops;
                for (var i = 0; i < stops.length; i++) {
                    if (stops[i])
                        routeList+="<div class=\"route_info\" id=\"Stop" + stops[i].Address + "\"\n>\n<h2>" + stops[i].Address + "</h2>\n<div class=\"route_info_timing\">\n<p id=\"Stop" + stops[i].Address + "Estimate\"></p>\n</div>\n</div>\n";
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
    num = ConfirmIdentity(req.body.username, req.body.password);
    console.log("Received get estimate request from user " + num + " with body ", req.body);

    // If the bus number is valid, send them the updated route info
    if (num !== -1) {
        // Strip off sensitive position data from stops before sending
        var routeList = JSON.parse(JSON.stringify(BusData.GetBusData(num).Stops));
        for (var i = 0; i < routeList.length; i++) {
            if (routeList[i])
                routeList[i].Position = null;
        }

        res.send({Stops: routeList, BusNumber: num});
    } else  // Otherwise, reject their request
        res.send("lmfao nah fam");
});


// To generate new keys: openssl req -nodes -new -x509 -keyout key.pem -out cert.pem
//http.createServer(app).listen(8000);  // HTTP protocalls are not encrypted nor secure--avoid use
https.createServer({
    key: fs.readFileSync("EncryptionKeyTests/key.pem"),
    cert: fs.readFileSync("EncryptionKeyTests/cert.pem"),
}, app).listen(8443);

console.log("HTTPS on 8443");