// Created with help of my brother, basis pulled off from https://github.com/Maxattax97/sample-nodejs-host-client
// Takes and interprets packets from modules and clients

const modulesRoot = "../node_modules/";

const fs = require(modulesRoot + "file-system");

const https = require("https");
const http = require("http");

const express = require(modulesRoot + "express");
const parser = require(modulesRoot + "body-parser");

//const ws = require(modulesRoot + "ws");

const app = express();
app.use(parser.urlencoded({extended:false}));
app.use(parser.json());

let latest_gps = null;

const webPage = "<body>\n<h1>testing</h1><br><p>one, two, three</p></body>";

app.post("api/gps", (req, res) => {
    console.log("Recieved GPS input", req.body);
    latest_gps = req.body;
    res.send("Success!");
});

app.get("api/gps", (req, res) => {
    console.log("Sending latest GPS data:", latest_gps);
    res.send(latest_gps);
});

app.all("/", (req, res) => {
    console.log("Displaying front page");
    res.send(webPage);
})


// To generate new keys: openssl req -nodes -new -x509 -keyout key.pem -out cert.pem
http.createServer(app).listen(8000);
https.createServer({
    key: fs.readFileSync("EncryptionKeyTests/key.pem"),
    cert: fs.readFileSync("EncryptionKeyTests/cert.pem"),
}, app).listen(8443);

console.log("HTTPS on 8443, HTTP on 8000");