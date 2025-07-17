function decodeUplink(input) {
	return { 
		data: Decode(input.fPort, input.bytes, input.variables)
	};   
}

function getNodeType(bytes) {
	var validProbes = 0;
	
	// Check TempC1 (bytes[2] and bytes[3])
	if(!((bytes[2]==0x7f)&&(bytes[3]==0xff))) {
		validProbes++;
	}
	
	// Check TempC2 (bytes[7] and bytes[8])  
	if(!((bytes[7]==0x7f)&&(bytes[8]==0xff))) {
		validProbes++;
	}
	
	// Check TempC3 (bytes[9] and bytes[10])
	if(!((bytes[9]==0x7f)&&(bytes[10]==0xff))) {
		validProbes++;
	}
	
	// Return node type based on number of valid probes
	if(validProbes === 1) {
		return "D20-LB";
	} else if(validProbes === 2) {
		return "D22-LB";
	} else if(validProbes === 3) {
		return "D23-LB";
	} else {
		// Default to D20-LB if no valid probes detected
		return "D20-LB";
	}
}

function getNodeTypeFromDatalog(bytes) {
	var validProbes = 0;
	
	// For datalog messages, check the first record (first 11 bytes)
	// Check TempC1 (bytes[0] and bytes[1])
	if(!((bytes[0]==0x7f)&&(bytes[1]==0xff))) {
		validProbes++;
	}
	
	// Check TempC2 (bytes[2] and bytes[3])  
	if(!((bytes[2]==0x7f)&&(bytes[3]==0xff))) {
		validProbes++;
	}
	
	// Check TempC3 (bytes[4] and bytes[5])
	if(!((bytes[4]==0x7f)&&(bytes[5]==0xff))) {
		validProbes++;
	}
	
	// Return node type based on number of valid probes
	if(validProbes === 1) {
		return "D20-LB";
	} else if(validProbes === 2) {
		return "D22-LB";
	} else if(validProbes === 3) {
		return "D23-LB";
	} else {
		// Default to D20-LB if no valid probes detected
		return "D20-LB";
	}
}


function datalog(i,bytes){
var aa= parseFloat(((bytes[0+i]<<24>>16 | bytes[1+i])/10).toFixed(1));
var bb= parseFloat(((bytes[2+i]<<24>>16 | bytes[3+i])/10).toFixed(1));
var cc= parseFloat(((bytes[4+i]<<24>>16 | bytes[5+i])/10).toFixed(1));
var dd= (bytes[6+i]&0x02) ? "High":"Low";
var ee= (bytes[6+i]&0x01) ? "True":"False";
var ff= getMyDate((bytes[7+i]<<24 | bytes[8+i]<<16 | bytes[9+i]<<8 | bytes[10+i]).toString(10));
var string='['+aa+','+bb+','+cc+','+dd+','+ee+','+ff+']'+',';  

return string;
}

function getzf(c_num){ 
if(parseInt(c_num) < 10)
c_num = '0' + c_num; 

return c_num; 
}

function getMyDate(str){ 
var c_Date;
if(str > 9999999999)
c_Date = new Date(parseInt(str));
else 
c_Date = new Date(parseInt(str) * 1000);

var c_Year = c_Date.getFullYear(), 
c_Month = c_Date.getMonth()+1, 
c_Day = c_Date.getDate(),
c_Hour = c_Date.getHours(), 
c_Min = c_Date.getMinutes(), 
c_Sen = c_Date.getSeconds();
var c_Time = c_Year +'-'+ getzf(c_Month) +'-'+ getzf(c_Day) +' '+ getzf(c_Hour) +':'+ getzf(c_Min) +':'+getzf(c_Sen); 

return c_Time;
}

function Decode(fPort, bytes, variables) {
//D23-LB Decode   
if(fPort==0x02)
{
var decode = {};
var mode=(bytes[6] & 0x7C)>>2;
decode.Node_type=getNodeType(bytes);
if(mode===3)
{
  decode.BatV=(bytes[0]<<8 | bytes[1])/1000;
  decode.EXTI_Trigger=(bytes[6] & 0x01)? "TRUE":"FALSE";
  decode.Door_status=(bytes[6] & 0x80)? "CLOSE":"OPEN";     
  if((bytes[2]==0x7f)&&(bytes[3]==0xff))
	decode.TempC1= "NULL";
  else
  {
	decode.TempC1= parseFloat(((bytes[2]<<24>>16 | bytes[3])/10).toFixed(1));
  }
	
  if(!((bytes[7]==0x7f)&&(bytes[8]==0xff)))
  {
	decode.TempC2= parseFloat(((bytes[7]<<24>>16 | bytes[8])/10).toFixed(1));
  }
	
  if(!((bytes[9]==0x7f)&&(bytes[10]==0xff)))
  {
	decode.TempC3= parseFloat(((bytes[9]<<24>>16 | bytes[10])/10).toFixed(1));
  }
}
else if(mode==31)
{
  decode.TEMPC1_MIN= bytes[4]<<24>>24;
  decode.TEMPC1_MAX= bytes[5]<<24>>24;
  decode.TEMPC2_MIN= bytes[7]<<24>>24;
  decode.TEMPC2_MAX= bytes[8]<<24>>24;
  decode.TEMPC3_MIN= bytes[9]<<24>>24;
  decode.TEMPC3_MAX= bytes[10]<<24>>24;       
}

if(bytes.length==11)
  return decode;
}
else if(fPort==3)  
{
var pnack= ((bytes[6]>>7)&0x01) ? "True":"False";
for(var i=0;i<bytes.length;i=i+11)
{
  var data= datalog(i,bytes);
  if(i=='0')
	data_sum=data;
  else
	data_sum+=data;
}
return{
Node_type:getNodeTypeFromDatalog(bytes),
DATALOG:data_sum,
PNACKMD:pnack,
};    
}
else if(fPort==5)
{
  var freq_band;
  var sub_band;
var sensor;

if(bytes[0]==0x19)
  sensor= "D23-LB";
  
  var firm_ver= (bytes[1]&0x0f)+'.'+(bytes[2]>>4&0x0f)+'.'+(bytes[2]&0x0f);
  
if(bytes[3]==0x01)
	freq_band="EU868";
  else if(bytes[3]==0x02)
	freq_band="US915";
  else if(bytes[3]==0x03)
	freq_band="IN865";
  else if(bytes[3]==0x04)
	freq_band="AU915";
  else if(bytes[3]==0x05)
	freq_band="KZ865";
  else if(bytes[3]==0x06)
	freq_band="RU864";
  else if(bytes[3]==0x07)
	freq_band="AS923";
  else if(bytes[3]==0x08)
	freq_band="AS923_1";
  else if(bytes[3]==0x09)
	freq_band="AS923_2";
  else if(bytes[3]==0x0A)
	freq_band="AS923_3";
  else if(bytes[3]==0x0F)
	freq_band="AS923_4";
  else if(bytes[3]==0x0B)
	freq_band="CN470";
  else if(bytes[3]==0x0C)
	freq_band="EU433";
  else if(bytes[3]==0x0D)
	freq_band="KR920";
  else if(bytes[3]==0x0E)
	freq_band="MA869";
  
if(bytes[4]==0xff)
  sub_band="NULL";
  else
  sub_band=bytes[4];

var bat= (bytes[5]<<8 | bytes[6])/1000;

  return {
	SENSOR_MODEL:sensor,
  FIRMWARE_VERSION:firm_ver,
  FREQUENCY_BAND:freq_band,
  SUB_BAND:sub_band,
  BAT:bat,
  }
}
}