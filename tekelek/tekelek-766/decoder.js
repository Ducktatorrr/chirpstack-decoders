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
		let contactReasonMsg = "";

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
		let lastResetMsg = "";

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
	} else if (port === 67 || bytes[0] === 0x43) {
		const msgType = bytes[0];
		const productId = bytes[1];
		const reserved = bytes[2];

		function u32le(i) {
			return (
				(bytes[i] |
					(bytes[i + 1] << 8) |
					(bytes[i + 2] << 16) |
					(bytes[i + 3] << 24)) >>> 0
			);
		}

		function u16le(i) {
			return (bytes[i] | (bytes[i + 1] << 8)) >>> 0;
		}

		let i = 3;
		let params = {};
		let rawParams = [];

		while (i < bytes.length) {
			if (i + 3 > bytes.length) {
				break;
			}

			const len = bytes[i];
			const id = (bytes[i + 1] << 8) | bytes[i + 2];
			const vStart = i + 3;
			const vEnd = vStart + len;

			if (vEnd > bytes.length) {
				rawParams.push({
					error: "truncated",
					at: i,
					len: len,
					id: id,
				});
				break;
			}

			rawParams.push({
				id_hex: "0x" + id.toString(16).padStart(4, "0"),
				len: len,
			});

			if (id === 0x0500 && len === 4) {
				const seconds = u32le(vStart);
				params.tx_period_s = seconds;
				params.tx_period_h = seconds / 3600;
			} else if (id === 0x0502 && len === 4) {
				const seconds = u32le(vStart);
				params.tx_random_s = seconds;
				params.tx_random_min = seconds / 60;
			} else if (id === 0x0503 && len === 4) {
				const seconds = u32le(vStart);
				params.logger_interval_s = seconds;
				params.logger_interval_min = seconds / 60;
			} else if (id === 0x0505 && len === 4) {
				const seconds = u32le(vStart);
				params.status_period_s = seconds;
				params.status_period_days = seconds / 86400;
			} else if (id === 0x4005 && len === 1) {
				params.ping_rate_min = bytes[vStart];
			} else if (id === 0x4006 && len === 1) {
				let v = bytes[vStart] & 0xff;
				params.rf_rssi_threshold_dbm = v > 127 ? v - 256 : v;
			} else if ((id === 0x4001 || id === 0x4002 || id === 0x4003) && len === 2) {
				const u16 = u16le(vStart);
				const threshold = u16 & 0x03ff;
				const tolerance = (u16 >> 10) & 0x0f;
				const enabled = ((u16 >> 14) & 0x01) === 1;
				const polarityHigher = ((u16 >> 15) & 0x01) === 1;

				const key =
					id === 0x4001 ? "limit1" : id === 0x4002 ? "limit2" : "limit3";

				params[key] = {
					threshold_cm: threshold,
					tolerance_cm: tolerance,
					enabled: enabled,
					polarity: polarityHigher
						? "higher_than_threshold"
						: "lower_than_threshold",
				};
			} else {
				let hex = "";
				for (let j = vStart; j < vEnd; j++) {
					hex += bytes[j].toString(16).padStart(2, "0");
				}
				params["param_" + id.toString(16).padStart(4, "0")] = hex;
			}

			i = vEnd;
		}

		decoded = {
			msgType: "0x" + msgType.toString(16),
			productId: "0x" + productId.toString(16),
			reserved: "0x" + reserved.toString(16),
			...params,
			_raw_param_list: rawParams,
		};
	}

	if (Object.keys(decoded).length === 0) {
		decoded = {
			raw: bytes,
		};
	}

	return decoded;
}