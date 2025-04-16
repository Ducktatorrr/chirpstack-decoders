function decodeUplink(input) {
	return {
		data: Decode(input.fPort, input.bytes, input.variables),
	};
}

function Str1(str2) {
	var str3 = "";
	for (var i = 0; i < str2.length; i++) {
		if (str2[i] <= 0x0f) {
			str2[i] = "0" + str2[i].toString(16) + "";
		}
		str3 += str2[i].toString(16) + "";
	}
	return str3;
}
function str_pad(byte) {
	var zero = "00";
	var hex = byte.toString(16);
	var tmp = 2 - hex.length;
	return zero.substr(0, tmp) + hex + " ";
}

function datalog(i, bytes) {
	var bb = parseFloat(
		((((bytes[0 + i] << 24) >> 16) | bytes[1 + i]) / 100).toFixed(2)
	);
	var cc = parseFloat(
		((((bytes[2 + i] << 24) >> 16) | bytes[3 + i]) / 100).toFixed(2)
	);
	// Commented out original code from Dragino that incorrectly cut off the last digit of the soil moisture value
	// var dd = parseFloat(
	// 	((((bytes[4 + i] << 8) | bytes[5 + i]) & 0xfff) / 10).toFixed(1)
	// );
	var dd = parseFloat(((bytes[4 + i] << 8) | bytes[5 + i]).toFixed(1));

	var ee = getMyDate(
		(
			(bytes[7 + i] << 24) |
			(bytes[8 + i] << 16) |
			(bytes[9 + i] << 8) |
			bytes[10 + i]
		).toString(10)
	);
	var string = "[" + bb + "," + cc + "," + dd + "," + ee + "]" + ",";

	return string;
}

function getzf(c_num) {
	if (parseInt(c_num) < 10) c_num = "0" + c_num;

	return c_num;
}

function getMyDate(str) {
	var c_Date;
	if (str > 9999999999) c_Date = new Date(parseInt(str));
	else c_Date = new Date(parseInt(str) * 1000);

	var c_Year = c_Date.getFullYear(),
		c_Month = c_Date.getMonth() + 1,
		c_Day = c_Date.getDate(),
		c_Hour = c_Date.getHours(),
		c_Min = c_Date.getMinutes(),
		c_Sen = c_Date.getSeconds();
	var c_Time =
		c_Year +
		"-" +
		getzf(c_Month) +
		"-" +
		getzf(c_Day) +
		" " +
		getzf(c_Hour) +
		":" +
		getzf(c_Min) +
		":" +
		getzf(c_Sen);

	return c_Time;
}

function Decode(fPort, bytes, variables) {
	var mode = (bytes[6] & 0x7c) >> 2;
	var data = {};
	var decode = {};
	var value;
	var mod;

	if (fPort == 0x02) {
		var mod = (bytes[10] >> 7) & 0x01;
		decode.BatV = (((bytes[0] << 8) | bytes[1]) & 0x3fff) / 1000; //Battery,units:V

		var value = (bytes[2] << 8) | bytes[3];
		if (bytes[2] & 0x80) {
			value |= 0xffff0000;
		}
		decode.temp_DS18B20 = (value / 10).toFixed(2); //DS18B20,temperature

		if (mod === 0) {
			value = (bytes[6] << 8) | bytes[7];
			var temp_SOIL;
			if ((value & 0x8000) >> 15 === 0)
				decode.temp_SOIL = (value / 100).toFixed(2); //temp_SOIL,temperature
			else if ((value & 0x8000) >> 15 === 1)
				decode.temp_SOIL = ((value - 0xffff) / 100).toFixed(2);
			decode.water_SOIL = (((bytes[4] << 8) | bytes[5]) / 100).toFixed(2); //water_SOIL,Humidity,units:%
			decode.conduct_SOIL = (bytes[8] << 8) | bytes[9];
		} else {
			decode.Soil_dielectric_constant = (
				((bytes[4] << 8) | bytes[5]) /
				10
			).toFixed(1);
			decode.Raw_water_SOIL = (bytes[6] << 8) | bytes[7];
			decode.Raw_conduct_SOIL = (bytes[8] << 8) | bytes[9];
		}
		decode.s_flag = (bytes[10] >> 4) & 0x01;
		decode.i_flag = bytes[10] & 0x0f;
		decode.Mod = mod;
		return decode;
	} else if (fPort == 3) {
		var pnack = (bytes[6] >> 7) & 0x01 ? "True" : "False";
		for (var i = 0; i < bytes.length; i = i + 11) {
			var data = datalog(i, bytes);
			if (i == "0") data_sum = data;
			else data_sum += data;
		}
		return {
			DATALOG: data_sum,
			PNACKMD: pnack,
		};
	} else if (fPort == 0x05) {
		var sub_band;
		var freq_band;
		var sensor;

		if (bytes[0] == 0x26) sensor = "SE01-LB";

		if (bytes[4] == 0xff) sub_band = "NULL";
		else sub_band = bytes[4];

		if (bytes[3] == 0x01) freq_band = "EU868";
		else if (bytes[3] == 0x02) freq_band = "US915";
		else if (bytes[3] == 0x03) freq_band = "IN865";
		else if (bytes[3] == 0x04) freq_band = "AU915";
		else if (bytes[3] == 0x05) freq_band = "KZ865";
		else if (bytes[3] == 0x06) freq_band = "RU864";
		else if (bytes[3] == 0x07) freq_band = "AS923";
		else if (bytes[3] == 0x08) freq_band = "AS923_1";
		else if (bytes[3] == 0x09) freq_band = "AS923_2";
		else if (bytes[3] == 0x0a) freq_band = "AS923_3";
		else if (bytes[3] == 0x0b) freq_band = "CN470";
		else if (bytes[3] == 0x0c) freq_band = "EU433";
		else if (bytes[3] == 0x0d) freq_band = "KR920";
		else if (bytes[3] == 0x0e) freq_band = "MA869";

		var firm_ver =
			(bytes[1] & 0x0f) +
			"." +
			((bytes[2] >> 4) & 0x0f) +
			"." +
			(bytes[2] & 0x0f);
		bat = ((bytes[5] << 8) | bytes[6]) / 1000;
		return {
			SENSOR_MODEL: sensor,
			FIRMWARE_VERSION: firm_ver,
			FREQUENCY_BAND: freq_band,
			SUB_BAND: sub_band,
			BAT: bat,
		};
	}
}
