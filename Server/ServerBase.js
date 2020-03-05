// Created with help of my brother, basis pulled off from https://github.com/Maxattax97/sample-nodejs-host-client
// Takes and interprets packets from modules and clients

// from EDDBusTracker: $ node ./Server/ServerBase.js
// connect to https:/localhost:8443 from browser

const fs = require("fs");

const https = require("https");
const http = require("http");

const express = require("express");
const parser = require("body-parser");

//const ws = require(modulesRoot + "ws");

const loginPage = fs.readFileSync("Client/login.html", "utf8");
const webPage = fs.readFileSync("Client/route_display.html", "utf8");

const app = express();
app.use(parser.urlencoded({extended:false}));
app.use(parser.json());

const BusData = require("./BusData.js");

var IsTracking = true;

app.post("/api/gps", (req, res) => {
    console.log("Recieved GPS input");
    
    BusData.StorePoint(req.body);

    // Respond by telling the tracker to keep sending data (or to be done)
    res.send(IsTracking);
});

/*
app.get("/api/gps", (req, res) => {
    console.log("Sending latest GPS data:", latest_gps);
    res.send(latest_gps);
});
*/



// Web Application //

// Confirm user's identity and locate bus number they use--returns -1 if they are not in the system
function ConfirmIdentity(username, password) {
    if (username == "admin" && password == "password")
        return 10;
    else
        return -1;
}


// Typical browser-access, send them web-page info
app.all("/login", (req, res) => {
    console.log("Displaying login to request", req.body);
    res.send(loginPage);
});
app.all("/", (req, res) => {
    console.log("On webpage, recieved login request", req.body);

    if (!req.body.username || !req.body.password)
        res.redirect("/login");
    else {
        var id = ConfirmIdentity(req.body.username, req.body.password);
        if (id !== -1) {
            console.log("Login succeeded!");
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

        } else   // Deny client and boot them back to login panel
            res.redirect("/login?failed");
    }
});
// Reply to estimation requests by confirming identity (currently, send raw data)
app.post("/get-estimate", (req, res) => {
    num = ConfirmIdentity(req.body.username, req.body.password);
    console.log("Received get estimate request from user " + num + " with body ", req.body);

    if (num !== -1) {
        // Strip off sensitive position data from stops before sending
        var routeList = JSON.parse(JSON.stringify(BusData.GetBusData(num).Stops));
        for (var i = 0; i < routeList.length; i++) {
            if (routeList[i])
                routeList[i].Position = null;
        }

        res.send({Stops: routeList, BusNumber: num});
    } else
        res.send("lmfao nah fam");
});


// To generate new keys: openssl req -nodes -new -x509 -keyout key.pem -out cert.pem
//http.createServer(app).listen(8000);  // HTTP protocalls are not secure--avoid use
https.createServer({
    key: fs.readFileSync("EncryptionKeyTests/key.pem"),
    cert: fs.readFileSync("EncryptionKeyTests/cert.pem"),
}, app).listen(8443);

console.log("HTTPS on 8443");