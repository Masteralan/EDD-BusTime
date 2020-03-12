// Written by Alan O'Cull and Will Vance
// Loads in and handles data and calculations

// How close GPS coordinates have to be to be considered "there"
const stopLeniency = 0.0005;

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
function GetDistance(pos1, pos2) {
    return Math.sqrt(Math.pow(pos2[0] - pos1[0], 2) + Math.pow(pos2[1] - pos1[1], 2));
}
// Informs if one location is close enough to another based off the stopLeniency threshold
function IsThere(pos1, pos2) {
    return (Math.sqrt(GetDistance(pos1, pos2)) <= stopLeniency);
}
// Finds the time difference from two given ISO strings
function GetTimeDifference(time1, time2) {
    return (time1 - time2)/1000;
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
            data.Stops[i].estimate = 0;
        }
    }
    
    // Pushes new object to the array
    Data.push(data);
}

// Any functions within here are callable by anything that requires this module
module.exports = {
    // Returns the bus data object for the provided bus number
    GetBusData: function(busNumber) {
        for (var i = 0; i < Data.length; i++) {
            if (busNumber == Data[i].BusNumber)
                return Data[i];
        }
        
        console.warn("Bus number " + busNumber + " not found!");
        return null;
    },

    // Stores given GPS packet into proper data field (should make estimates)
    StorePoint: function(packet) {
        var index = -1;

        for (var i = 0; i < Data.length; i++) {
            if (packet.busNumber == Data[i].BusNumber) {
                index = i;
                break;
            }
        }

        // If bus was not found, generate one for the datapoint, but if it was still not found, return with a warning
        if (index == -1) {
            console.log("Bus was not found in data list! Attempting to create a new one...");
            GenerateBus(packet.busNumber, GetBusStops(packet.busNumber));

            for (var i = 0; i < Data.length; i++) {
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

        var pos = [packet.lat, packet.long, packet.alt];

        const positions = Data[index].Positions;
        const times = Data[index].Times;
	    if (positions.length >= 1) {
            const t = GetTimeDifference(packet.time, times[times.length-1]);
            const latSpeed =  (pos[0] - positions[positions.length-1][0])  / t;
            const longSpeed = (pos[1] - positions[positions.length-1][1]) / t;

            console.log(GetTimeDifference(packet.time, times[times.length-1]));
            if (t > 0) {
                const speed = Math.sqrt(Math.pow(Math.abs(latSpeed),2) + Math.pow(Math.abs(longSpeed),2));
                Data[index].Speeds.push(speed);
            } else Data[index].Speeds.push(0);
        } else Data[index].Speeds.push(0);

        // Push new info to object in Data
        Data[index].Positions.push(pos);  
        Data[index].Times.push(packet.time);

        // Mark stops that the bus has arrived at, and calculate estimates for others
        var stops = Data[index].Stops;
        for (var i = 0; i < stops.length; i++) {
            if (IsThere(pos, stops[i].Position)) {
                stops[i].arrived = true;
                stops[i].estimate = 0;
            } else if (!stops[i].arrived) {
                var estimate = 0;
                for (var j = 0; j < i; j++) {   // Account for all previos stop times
                    estimate+=stops[j].estimate;
                }
                
                // Get average speed from last stop to now
                const speeds = Data[index].Speeds;
                var avgSpeed = 0;
                for (var j = 0; j < speeds.length; j++) {
                    avgSpeed+=speeds[j]++;
                }

                avgSpeed/=speeds.length;
                estimate += GetDistance(pos, stops[i].Position)/avgSpeed;
                stops[i].estimate = estimate;
            }
        }
    }
}