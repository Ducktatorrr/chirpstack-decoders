// lppDecode decodes an array of bytes into an array of ojects,
// each one with the channel, the data type and the value.
function lppDecode(bytes) {
	var sensor_types = {
		0: { size: 1, name: "digital_in", signed: false, divisor: 1 },
		1: { size: 1, name: "digital_out", signed: false, divisor: 1 },
		2: { size: 2, name: "analog_in", signed: true, divisor: 100 },
		3: { size: 2, name: "analog_out", signed: true, divisor: 100 },
		100: { size: 4, name: "generic", signed: false, divisor: 1 },
		101: { size: 2, name: "illuminance", signed: false, divisor: 1 },
		102: { size: 1, name: "presence", signed: false, divisor: 1 },
		103: { size: 2, name: "temperature", signed: true, divisor: 10 },
		104: { size: 1, name: "humidity", signed: false, divisor: 2 },
		112: { size: 2, name: "humidity_prec", signed: true, divisor: 10 },
		113: { size: 6, name: "accelerometer", signed: true, divisor: 1000 },
		115: { size: 2, name: "barometer", signed: false, divisor: 10 },
		116: { size: 2, name: "voltage", signed: false, divisor: 100 },
		117: { size: 2, name: "current", signed: false, divisor: 1000 },
		118: { size: 4, name: "frequency", signed: false, divisor: 1 },
		120: { size: 1, name: "percentage", signed: false, divisor: 1 },
		121: { size: 2, name: "altitude", signed: true, divisor: 1 },
		125: { size: 2, name: "concentration", signed: false, divisor: 1 },
		128: { size: 2, name: "power", signed: false, divisor: 1 },
		130: { size: 4, name: "distance", signed: false, divisor: 1000 },
		131: { size: 4, name: "energy", signed: false, divisor: 1000 },
		132: { size: 2, name: "direction", signed: false, divisor: 1 },
		133: { size: 4, name: "time", signed: false, divisor: 1 },
		134: { size: 6, name: "gyrometer", signed: true, divisor: 100 },
		135: { size: 3, name: "colour", signed: false, divisor: 1 },
		136: { size: 9, name: "gps", signed: true, divisor: [10000, 10000, 100] },
		137: {
			size: 11,
			name: "gps",
			signed: true,
			divisor: [1000000, 1000000, 100],
		},
		138: { size: 2, name: "voc", signed: false, divisor: 1 },
		142: { size: 1, name: "switch", signed: false, divisor: 1 },
		188: { size: 2, name: "soil_moist", signed: false, divisor: 10 },
		190: { size: 2, name: "wind_speed", signed: false, divisor: 100 },
		191: { size: 2, name: "wind_direction", signed: false, divisor: 1 },
		192: { size: 2, name: "soil_ec", signed: false, divisor: 1000 },
		193: { size: 2, name: "soil_ph_h", signed: false, divisor: 100 },
		194: { size: 2, name: "soil_ph_l", signed: false, divisor: 10 },
		195: { size: 2, name: "pyranometer", signed: false, divisor: 1 },
		203: { size: 1, name: "light", signed: false, divisor: 1 },
	};

	function arrayToDecimal(stream, is_signed, divisor) {
		var value = 0;
		for (var i = 0; i < stream.length; i++) {
			if (stream[i] > 0xff) throw "Byte value overflow!";
			value = (value << 8) | stream[i];
		}

		if (is_signed) {
			var edge = 1 << (stream.length * 8); // 0x1000..
			var max = (edge - 1) >> 1; // 0x0FFF.. >> 1
			value = value > max ? value - edge : value;
		}

		value /= divisor;

		return value;
	}

	var sensors = [];
	var i = 0;
	while (i < bytes.length) {
		var s_no = bytes[i++];
		var s_type = bytes[i++];
		if (typeof sensor_types[s_type] == "undefined") {
			throw "Sensor type error!: " + s_type;
		}

		var s_value = 0;
		var type = sensor_types[s_type];
		switch (s_type) {
			case 113: // Accelerometer
			case 134: // Gyrometer
				s_value = {
					x: arrayToDecimal(
						bytes.slice(i + 0, i + 2),
						type.signed,
						type.divisor
					),
					y: arrayToDecimal(
						bytes.slice(i + 2, i + 4),
						type.signed,
						type.divisor
					),
					z: arrayToDecimal(
						bytes.slice(i + 4, i + 6),
						type.signed,
						type.divisor
					),
				};
				break;
			case 136: // GPS Location
				s_value = {
					latitude: arrayToDecimal(
						bytes.slice(i + 0, i + 3),
						type.signed,
						type.divisor[0]
					),
					longitude: arrayToDecimal(
						bytes.slice(i + 3, i + 6),
						type.signed,
						type.divisor[1]
					),
					altitude: arrayToDecimal(
						bytes.slice(i + 6, i + 9),
						type.signed,
						type.divisor[2]
					),
				};
				break;
			case 137: // Precise GPS Location
				s_value = {
					latitude: arrayToDecimal(
						bytes.slice(i + 0, i + 4),
						type.signed,
						type.divisor[0]
					),
					longitude: arrayToDecimal(
						bytes.slice(i + 4, i + 8),
						type.signed,
						type.divisor[1]
					),
					altitude: arrayToDecimal(
						bytes.slice(i + 8, i + 11),
						type.signed,
						type.divisor[2]
					),
				};
				sensors.push({
					channel: s_no,
					type: s_type,
					name: "location",
					value: "(" + s_value.latitude + "," + s_value.longitude + ")",
				});
				sensors.push({
					channel: s_no,
					type: s_type,
					name: "altitude",
					value: s_value.altitude,
				});
				break;
			case 135: // Colour
				s_value = {
					r: arrayToDecimal(
						bytes.slice(i + 0, i + 1),
						type.signed,
						type.divisor
					),
					g: arrayToDecimal(
						bytes.slice(i + 1, i + 2),
						type.signed,
						type.divisor
					),
					b: arrayToDecimal(
						bytes.slice(i + 2, i + 3),
						type.signed,
						type.divisor
					),
				};
				break;

			default: // All the rest
				s_value = arrayToDecimal(
					bytes.slice(i, i + type.size),
					type.signed,
					type.divisor
				);
				break;
		}

		sensors.push({
			channel: s_no,
			type: s_type,
			name: type.name,
			value: s_value,
		});

		i += type.size;
	}

	return sensors;
}

function Decode(fPort, bytes, variables) {
	// bytes = input.bytes;
	// fPort = input.fPort;

	// flat output (like original decoder):
	var response = {};
	lppDecode(bytes, 1).forEach(function (field) {
		response[field["name"] + "_" + field["channel"]] = field["value"];
	});
	return response;
}

// Chirpstack v3 to v4 compatibility wrapper
function decodeUplink(input) {
	return {
		data: Decode(input.fPort, input.bytes, input.variables),
	};
}
