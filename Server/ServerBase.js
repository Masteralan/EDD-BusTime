// Created with help of my brother, basis pulled off from https://github.com/Maxattax97/sample-nodejs-host-client
// Takes and interprets packets from modules and clients

// from EDDBusTracker: $ node ./Server/ServerBase.js
// connect to https:/localhost:8443 from browser

const modulesRoot = "../node_modules/";

const fs = require(modulesRoot + "file-system");

const https = require("https");
const http = require("http");

const express = require(modulesRoot + "express");
const parser = require(modulesRoot + "body-parser");

//const ws = require(modulesRoot + "ws");

const loginPage = fs.readFileSync("Client/login.html", "utf8");
const webPage = fs.readFileSync("Client/route_display.html", "utf8");

const app = express();
app.use(parser.urlencoded({extended:false}));
app.use(parser.json());

let latest_gps = null;

app.post("api/gps", (req, res) => {
    console.log("Recieved GPS input", req.body);
    latest_gps = req.body;
    res.send("Success!");
});

app.get("api/gps", (req, res) => {
    console.log("Sending latest GPS data:", latest_gps);
    res.send(latest_gps);
});

// Typical browser-access, send them web-page info
app.all("/", (req, res) => {
    console.log("Displaying login to request", req.body);
    res.send(loginPage);
})
app.post("/view", (req, res) => {
    console.log("On webpage, recieved login request", req.body);
    if (req.body.username == "admin" && req.body.password == "password") {
        console.log("Login succeeded!");
        res.send(webPage);
    } else {
        console.log("Login failed.");
        res.send("<body>Login failed</body>");
    }
})


// To generate new keys: openssl req -nodes -new -x509 -keyout key.pem -out cert.pem
http.createServer(app).listen(8000);
https.createServer({
    key: fs.readFileSync("EncryptionKeyTests/key.pem"),
    cert: fs.readFileSync("EncryptionKeyTests/cert.pem"),
}, app).listen(8443);

console.log("HTTPS on 8443, HTTP on 8000");