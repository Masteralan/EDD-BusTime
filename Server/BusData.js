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
// Informs if one location is close enough to another based off the stopLeniency threshold
function IsThere(pos1, pos2) {
    return (Math.sqrt(Math.pow(pos2[0] - pos1[0],2) + Math.pow(pos2[1] - pos1[1],2) + Math.pow(pos2[2] - pos1[2], 2)) <= stopLeniency);
}




var Data = [];


function GenerateBus(busNum, stops) {
    var data = {
        BusNumber: busNum,
        Stops: stops,
        Positions: [],
        Times: []
    }

    // If stops exist... Note: Busses do not need stops to be tracked as administration might want to still know their location
    if (stops) {
        // Add an "arrived" state and time prediction for each stop
        for (var i = 0; i < stops.length; i++) {
            data.Stops[i].arrived = false;
            data.Stops[i].estimate = 0;
        }
    }
    
    Data.push(data);
}

module.exports = {
    GetBusData: function(busNum) {
        for (var i = 0; i < Data.length; i++) {
            if (busNumber == Data[i].BusNumber)
                return Data[i];
        }
    },

    StorePoint: function(packet) {
        var index = -1;

        for (var i = 0; i < Data.length; i++) {
            if (packet.busNumber == Data[i].BusNumber) {
                index = i;
                break;
            }
        }

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

        Data[index].Positions.push(pos);  
        Data[index].Times.push(packet.time);

        var stops = Data[index].Stops;
        for (var i = 0; i < stops.length; i++) {
            if (IsThere(pos, stops[i].Position)) {
                stops[i].arrived = true;
                stops[i].estimate = 0;
            }
        }
    }
}