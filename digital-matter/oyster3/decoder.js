function decodeUplink(input) {
    var port = input.fPort;
    var bytes = input.bytes;
    var decoded = {};
  
    if (port === 1) {
      var latitude = bytes[0] | bytes[1] << 8 | bytes[2] << 16 | (bytes[3] << 24 >> 0);
      if (latitude >= 0x80000000) // 2^31
        latitude -= 0x100000000; // 2^32
      latitude /= 1e7;
  
      var longitude = bytes[4] | bytes[5] << 8 | bytes[6] << 16 | (bytes[7] << 24 >> 0);
      if (longitude >= 0x80000000) // 2^31
        longitude -= 0x100000000; // 2^32
      longitude /= 1e7;
      decoded = {
        type: "position",
        inTrip: (bytes[8] & 0x1) !== 0,
        fixFailed: (bytes[8] & 0x2) !== 0,
        batV: Number((bytes[10] * 0.025).toFixed(2)),
        manDown: null,
        latitude: latitude,
        longitude: longitude,
        headingDeg: (bytes[8] >> 2) * 5.625,
        speedKmph: bytes[9]
      };
    } else if (port === 4) {
      var latitude = bytes[0] + bytes[1] * 256 + bytes[2] * 65536;
      if (latitude >= 0x800000) // 2^23
        latitude -= 0x1000000; // 2^24
      latitude = latitude * 256e-7;
  
      var longitude = bytes[3] + bytes[4] * 256 + bytes[5] * 65536;
      if (longitude >= 0x800000) // 2^23
        longitude -= 0x1000000; // 2^24
      longitude = longitude * 256e-7;
  
      decoded = {
        type: "position",
        batV: Number((bytes[7] * 0.025).toFixed(2)),
        inTrip: (bytes[8] & 0x1) !== 0,
        fixFailed: (bytes[8] & 0x2) !== 0,
        manDown: (bytes[8] & 0x4) !== 0,
        latitude: latitude,
        longitude: longitude,
        headingDeg: (bytes[6] & 0x7) * 45,
        speedKmph: (bytes[6] >> 3) * 5
      };
    } else if (port === 2) {
      decoded = {
        type: "downlink ack",
        sequence: (bytes[0] & 0x7F),
        accepted: ((bytes[0] & 0x80) !== 0),
        fwMaj: bytes[1],
        fwMin: bytes[2]
      };
    } else if (port === 3) {
      decoded = {
        type: "stats",
  
        initialBatV: Number((4.0 + 0.100 * (bytes[0] & 0xF)).toFixed(1)),
        txCount: 32 * ((bytes[0] >> 4) + (bytes[1] & 0x7F) * 16),
        tripCount: 32 * ((bytes[1] >> 7) + (bytes[2] & 0xFF) * 2
          + (bytes[3] & 0x0F) * 512),
        gpsSuccesses: 32 * ((bytes[3] >> 4) + (bytes[4] & 0x3F) * 16),
        gpsFails: 32 * ((bytes[4] >> 6) + (bytes[5] & 0x3F) * 4),
        aveGpsFixS: 1 * ((bytes[5] >> 6) + (bytes[6] & 0x7F) * 4),
        aveGpsFailS: 1 * ((bytes[6] >> 7) + (bytes[7] & 0xFF) * 2),
        aveGpsFreshenS: 1 * ((bytes[7] >> 8) + (bytes[8] & 0xFF) * 1),
        wakeupsPerTrip: 1 * ((bytes[8] >> 8) + (bytes[9] & 0x7F) * 1),
        uptimeWeeks: 1 * ((bytes[9] >> 7) + (bytes[10] & 0xFF) * 2),
      };
    } else {
      decoded = {};
    }
  
    return {data: decoded};
  }