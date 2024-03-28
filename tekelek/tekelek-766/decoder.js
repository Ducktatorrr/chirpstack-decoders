function decodeUplink(input) {
	return {
		data: Decoder(input.bytes, input.fPort),
	};
}

function Decoder(bytes, port) {
	let decoded = {};
	let offset = 0;

	if (port === 16) {
		let ullage = (bytes[4] << 8) + bytes[5];
		let temp = bytes[6];
		if (temp > 50) {
			offset = 256;
		}
		let temperature = -(offset - temp);
		let src = bytes[7] >> 4;
		let srssi = bytes[7] & 0xf;

		decoded = {
			ullage_cm: ullage,
			temp_C: temperature,
			src: src,
			srssi: srssi,
		};
	} else if (port === 48) {
		let ullage = (bytes[14] << 8) + bytes[15];
		let temp = bytes[16];
		if (temp > 50) {
			offset = 256;
		}
		let temperature = -(offset - temp);
		let hardware = bytes[3];
		let firmware = bytes[4].toString() + "." + bytes[5].toString();
		let reasonBytes = bytes[6];
		let contactReason = reasonBytes & 0x3;
		var contactReasonMsg = "";
		switch (contactReason) {
			case 0:
				contactReasonMsg = "Reset";
				break;
			case 1:
				contactReasonMsg = "Scheduled";
				break;
			case 2:
				contactReasonMsg = "Manual";
				break;
			case 3:
				contactReasonMsg = "Activation";
				break;
		}
		let lastReset = (reasonBytes >> 2) & 0x7;
		var lastResetMsg = "";
		switch (lastReset) {
			case 0:
				lastResetMsg = "Power on";
				break;
			case 1:
				lastResetMsg = "Brown out";
				break;
			case 2:
				lastResetMsg = "External";
				break;
			case 3:
				lastResetMsg = "Watchdog";
				break;
			case 4:
				lastResetMsg = "M3 lockup";
				break;
			case 5:
				lastResetMsg = "M3 system request";
				break;
			case 6:
				lastResetMsg = "EM4";
				break;
			case 7:
				lastResetMsg = "Backup mode";
				break;
		}
		let activeStatus = (reasonBytes >> 5) & 0x1;
		let battery = bytes[10];
		let txPeriod = bytes[13];
		let sensorRSSI = -bytes[8];

		decoded = {
			ullage_cm: ullage,
			temp_C: temperature,
			firmware: firmware,
			contactReason: contactReasonMsg,
			lastReset: lastResetMsg,
			active: activeStatus,
			bat_pct: battery,
			txPeriod_h: txPeriod,
			sensorRSSI_dBm: sensorRSSI,
			hw_id: hardware,
		};
	}

	return decoded;
}
