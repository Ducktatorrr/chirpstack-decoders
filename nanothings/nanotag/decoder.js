function decodeUplink(input) {
    var port = input.fPort;
    var bytes = input.bytes;
    return {
        data: Decoder(port, bytes)
    };
}

function Decoder(port, bytes) {
    const decoded = {};
  
    const errors = {
      temperatureSensor: {
        communicationError: {
          errorCode: "FC",
          errorMessage: "Unable to communicate with temperature sensor. NanoTag should be considered unreliable"
        },
        outOfRangeBootHealth: {
          errorCode: "FF",
          errorMessage: "Collected temperature sample is out of operating range"
        },
        outOfRangeTemperatureFrame: {
          errorCode: "FFFF",
          errorMessage: "One or more collected temperature samples are out of operating range"
        }
      }
    };
  
    // Reconstruct original hex payload for further processing
    const hexBytes = bytes.map((byte) => {
      return byte.toString(16).padStart(2, "0");
    });
  
    function getLastTemperatureFromFrame(hexBytes) {
      const temperatureFrame = hexBytes.slice(2);
      const combinedHexValues = combineBytePairs(temperatureFrame).map(function(e) {
        return e.join("");
      });
    
      const lastTemperatureHex = combinedHexValues[combinedHexValues.length - 1];
      if (lastTemperatureHex && lastTemperatureHex.toUpperCase() === "FFFF") {
        decoded.error = errors.temperatureSensor.outOfRangeTemperatureFrame;
        return { temperatureCelsius: null };
      }
      if (lastTemperatureHex) {
        const parsedValue = parseInt(lastTemperatureHex, 16);
        const temperatureCelsius = (parsedValue - 5000) / 100;
        return {
          temperatureCelsius
        };
      }
      return { temperatureCelsius: null };
    }
    
  
    switch (port) {
      case 1:
        decoded.uplinkType = "boot_message";
        decoded.voltageMv = parseInt(hexBytes.slice(2, 4).join(""), 16);
        decoded.batteryStatus = getSimpleBatteryStatus(decoded.voltageMv);
        firstByte = hexBytes[0].toUpperCase();
        if (firstByte === "FC") {
          decoded.error = errors.temperatureSensor.communicationError
        }
        if (firstByte === "FF") {
          decoded.error = errors.temperatureSensor.outOfRangeBootHealth
        }
        break;
      case 13:
        decoded.uplinkType = "health_message";
        decoded.voltageMv = parseInt(hexBytes.slice(2, 4).join(""), 16);
        decoded.batteryStatus = getSimpleBatteryStatus(decoded.voltageMv);
        firstByte = hexBytes[0].toUpperCase();
        if (firstByte === "FC") {
          decoded.error = errors.temperatureSensor.communicationError
        }
        if (firstByte === "FF") {
          decoded.error = errors.temperatureSensor.outOfRangeBootHealth
        }
        break;
      case 21:
        decoded.uplinkType = "device_status_response";
        decoded.voltageMv = parseInt(hexBytes.slice(0, 2).join(""), 16);
        decoded.batteryStatus = getSimpleBatteryStatus(decoded.voltageMv);
        break;
      case 25:
        decoded.uplinkType = "configuration_acknowledgement";
        decoded.confirmedRecordPeriod = parseInt(hexBytes.slice(1, 3).join(""), 16);
        decoded.confirmedReportPeriod = parseInt(hexBytes.slice(3, 5).join(""), 16);
        decoded.confirmedConfigurationUnit = parseInt(hexBytes[5], 16);
        decoded.confirmedConfigurationUnitText = decoded.confirmedConfigurationUnit ? "seconds" : "minutes";
        break;
        case 26:
          decoded.uplinkType = "report_frame";
          decoded.frameId = parseInt(hexBytes.slice(0, 2).join(""), 16);
          const lastTemperatureForReportFrame = getLastTemperatureFromFrame(hexBytes);
          if (lastTemperatureForReportFrame.temperatureCelsius !== null) {
            decoded.temperatureCelsius = lastTemperatureForReportFrame.temperatureCelsius;
          }
          break;
        
        case 27:
          decoded.uplinkType = "recover_response";
          decoded.frameId = parseInt(hexBytes.slice(0, 2).join(""), 16);
          const lastTemperatureForRecoverResponse = getLastTemperatureFromFrame(hexBytes);
          if (lastTemperatureForRecoverResponse.temperatureCelsius !== null) {
            decoded.temperatureCelsius = lastTemperatureForRecoverResponse.temperatureCelsius;
          }
          break;
      case 28:
        decoded.uplinkType = "configuration_request";
        break;
      case 31:
        decoded.uplinkType = "low_voltage_warning";
        decoded.voltageMv = parseInt(hexBytes.join(""), 16);
        decoded.batteryStatus = getSimpleBatteryStatus(decoded.voltageMv);
        break;
      case 32:
        decoded.uplinkType = "device_shutdown_acknowledgement";
        decoded.voltageMv = parseInt(hexBytes.join(""), 16);
        decoded.batteryStatus = getSimpleBatteryStatus(decoded.voltageMv);
        break;
    }
    return decoded;
  }
  
  // Split reconstructed payload into processable segments
  function combineBytePairs(arr) {
    let offset = 0;
    const bytePairs = [];
    while (offset < arr.length) {
      bytePairs.push(arr.slice(offset, (offset += 2)));
    }
    return bytePairs;
  }
  
  // Return simplified battery status
  function getSimpleBatteryStatus(voltageMv) {
    if (voltageMv > 2850) {
      return "Excellent";
    } else if (voltageMv > 2750) {
      return "Good";
    } else if (voltageMv > 2650) {
      return "Low";
    } else if (voltageMv <= 2650) {
      return "Critical";
    }
  }