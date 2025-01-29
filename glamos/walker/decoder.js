function decodeUplink(input) {
	return {
		data: Decoder(input.bytes),
	};
}

function Decoder(bytes) {
	var decoded = {};

	// Decode latitude (3 bytes)
	decoded.latitude =
		((bytes[0] << 16) >>> 0) + ((bytes[1] << 8) >>> 0) + bytes[2];
	decoded.latitude = (decoded.latitude / 16777215.0) * 180 - 90;
	decoded.latitude = +decoded.latitude.toFixed(7);

	// Decode longitude (3 bytes)
	decoded.longitude =
		((bytes[3] << 16) >>> 0) + ((bytes[4] << 8) >>> 0) + bytes[5];
	decoded.longitude = (decoded.longitude / 16777215.0) * 360 - 180;
	decoded.longitude = +decoded.longitude.toFixed(7);

	// Decode altitude (2 bytes, signed)
	var altValue = ((bytes[6] << 8) >>> 0) + bytes[7];
	var sign = bytes[6] & (1 << 7);
	if (sign) {
		decoded.altitude = 0xffff0000 | altValue; // If the altitude is negative, sign-extend it
	} else {
		decoded.altitude = altValue;
	}

	// Antenna (1 byte)
	decoded.antenna = bytes[8];

	// Position (1 byte)
	decoded.position = bytes[9];

	return decoded;
}
