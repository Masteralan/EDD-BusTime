// Written by Alan O'Cull and Will Vance
// Loads in and handles data and calculations

// Used for storing logs
const fs = require('fs');
const filename = './logs/Log' + new Date().toISOString();
let saving = false;

// How close GPS coordinates have to be to be considered "there"
const stopLeniency = 0.001;
// Approximately how long a bus waits at a stop
const stopApproximationLength = 25;

// First, handle bus routes
const Routes = require("./Routes.json");    // Load in route data

function GetBusStops(busNum) {
    for (var i = 0; i < Routes.length; i++) {
        if (Routes[i].BusNumber == busNum)
            return Routes[i].Stops;
    }

    console.warn("Error: Could not find route for bus number " + busNum);
    return null;
}

function DegreesToRadians(angle) {
    return angle * Math.PI / 180;
}
function Round(num) {
    return Math.floor(num * 10000 + 0.5) / 10000;
}
// New non-eucladian distance formula adapted from https://andrew.hedges.name/experiments/haversine/
// Reccomended for short distances
function GetDistance(pos1, pos2) {
    const dlat = DegreesToRadians(pos2[0] - pos1[0]);
    const dlon = DegreesToRadians(pos2[1] - pos1[1]);

    const a = (Math.sin(dlat/2) ** 2) + Math.cos(DegreesToRadians(pos1[0])) * Math.cos(DegreesToRadians(pos2[0])) * (Math.sin(dlon/2) ** 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.abs(1-a)));

    return c * 3961;    // Convert to miles by multiplying by radius of Earth
}
// Informs if one location is close enough to another based off the stopLeniency threshold
function IsThere(pos1, pos2) {
    return (Math.sqrt(GetDistance(pos1, pos2)) <= stopLeniency);
}
// Finds the time difference from two given ISO strings
function GetTimeDifference(time1, time2) {
    return Math.abs((time1 - time2)/1000);
}

let log = '';
function Log(str) {
    log += str + '\n';
    console.log(str);
}



// Data list for current session
var Data = [];

// Creates a bus object within array Data, and fills it out with basic info
function GenerateBus(busNum, stops) {
    var data = {
        BusNumber: busNum,
        Stops: stops,
        Positions: [],
        Times: [],
        Speeds: []
    }

    // If stops exist... Note: Busses do not need stops to be tracked as administration might want to still know their location
    if (stops) {
        // Add an "arrived" state and time prediction for each stop
        for (var i = 0; i < stops.length; i++) {
            data.Stops[i].arrived = false;
            data.Stops[i].estimate = 5;
            data.Stops[i].TimeLeft = stopApproximationLength;
        }
    }
    
    // Pushes new object to the array
    Data.push(data);
}



// Initialize busses for existing routes
for (let i = 0; i < Routes.length; i++) {
    let hasbus = false;
    for (let j = 0; j < Data.length; j++) {
        if (Data[j].BusNumber == Routes[i].BusNumber) {
            hasbus = true;
            break;
        }
    }

    GenerateBus(Routes[i].BusNumber, Routes[i].Stops);
}



// Any functions within here are callable by anything that requires this module
module.exports = {
    // Returns the bus data object for the provided bus number
    GetBusData: function(busNumber) {
        for (let i = 0; i < Data.length; i++) {
            if (busNumber == Data[i].BusNumber)
                return Data[i];
        }
        
        console.warn("Bus number " + busNumber + " not found!");
        return null;
    },

    // Stores given GPS packet into proper data field (should make estimates)
    StorePoint: function(packet) {
        var index = -1;

        for (let i = 0; i < Data.length; i++) {
            if (packet.busNumber == Data[i].BusNumber) {
                index = i;
                break;
            }
        }

        // If bus was not found, generate one for the datapoint, but if it was still not found, return with a warning
        if (index == -1) {
            console.log("Bus was not found in data list! Attempting to create a new one...");
            GenerateBus(packet.busNumber, GetBusStops(packet.busNumber));

            for (let i = 0; i < Data.length; i++) {
                if (packet.busNumber == Data[i].BusNumber) {
                    index = i;
                    break;
                }
            }
            if (index == -1) {
                console.warn("Failed to find newly created bus " + packet.busNumber + " in list.");
                return;
            }
        }

        const pos = [packet.lat, packet.long];

        const positions = Data[index].Positions;
        const times = Data[index].Times;
	    if (positions.length >= 1) {
            // Calculate speed
            const t = GetTimeDifference(packet.time, times[times.length-1]);

            Log('\nTime since last packet is ' + t + ' seconds--current time is ' + (new Date().toISOString()));
            if (t > 0) {
                const speed = (GetDistance(pos, positions[positions.length-1]) / t) * 3600;

                // Only log speeds that are moving--otherwise, it is probably waiting at a stop or intersection and should not be counted
                // Do not include speeds that are > 90 mph (0.025 miles per second)
                if (speed > stopLeniency && speed < 90)
                    Data[index].Speeds.push(speed);
            Log("Distance from last position to current is " + Round(GetDistance(pos, positions[positions.length-1])) +
                " miles\nSpeed is approximately " + Round(speed) + " mph");
            }// else Data[index].Speeds.push(0);
        } else Data[index].Speeds.push(0);

        // Push new info to object in Data
        Data[index].Positions.push(pos);
        Data[index].Times.push(packet.time);

        // Mark stops that the bus has arrived at, and calculate estimates for others
        let stops = Data[index].Stops;
        if (stops) {
            for (let i = 0; i < stops.length; i++) {
                if (IsThere(pos, stops[i].Position)) {
                    stops[i].arrived = true;
                    stops[i].estimate = 0;

                    // Account for time bus has been waiting at the stop
                    stops[i].TimeLeft -= GetTimeDifference(packet.time, Data[index].times.length - 2);
                    if (stops[i].TimeLeft < 0) stops[i].TimeLeft = 0;

                } else if (!stops[i].arrived) {
                    // If any stops still had time remaining, clear it
                    if (i >= 2 && stops[i-1].arrived && stops[i-2].arrived && stops[i-2].TimeLeft > 0) {
                        stops[i-2].TimeLeft = 0;
                    }

                    var estimate = 0;
                    for (var j = 0; j < i; j++) {   // Account for all previos stop times
                        estimate+=stops[j].estimate + stops[j].TimeLeft;
                    }
                    
                    if (Data[index].Speeds.length > 0) {
                        // Get average speed from last stop to now
                        const speeds = Data[index].Speeds;
                        var avgSpeed = 0;
                        for (var j = 0; j < speeds.length; j++) {
                            avgSpeed+=speeds[j]++;
                        }

                        avgSpeed/=speeds.length;
                    }

                    if ((i > 0 && stops[i-1].arrived) || i == 0)    // If this is the current stop or the first one, get direct distance to stop
                        estimate += (GetDistance(pos, stops[i].Position) / avgSpeed) * 3600;
                    else if (i > 0) // Otherwise, use distance from first stop to second
                        estimate += (GetDistance(stops[i-1].Position, stops[i].Position) / avgSpeed) * 3600;
                    stops[i].estimate = estimate;
                    
                    Log(stops[i].Address + " approx " + Round(GetDistance(stops[i].Position, pos)) + " mi with ETA " + Round(estimate));
                }
            }
        }

        if (!saving) {
            saving = true;
            fs.writeFile(filename, log, (err) => {
                saving = false;
                if (err) {
                    Log('ERROR: Failed to save:' + err);
                    console.log('Save error', err);
                }
            });
        }
    }
}
