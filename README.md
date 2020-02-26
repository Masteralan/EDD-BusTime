# Bus Time

A tracking system for buses to help keep transportation staff and school students more informed on bus locations and timing.

## Tracker
Consists of Rapsberry Pi with GPS module. Sends data packets to server over GPS location of bus, server processes info.

## Server
Holds data and processes information and requests from both trackers and clients.
Data sent to client should not include actual bus locations for security.

## Client
Web page for client to interact with and view information.