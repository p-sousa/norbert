// Services
const NORBERT_ACC_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const NORBERT_ACC_CHARACTERISTIC_UUID = '0000fff3-0000-1000-8000-00805f9b34fb';

const NORBERT_FSR_SERVICE_UUID = "0000aa40-0000-1000-8000-00805f9b34fb"
const NORBERT_FSR_CHARACTERISTIC_UUID = "0000aa41-0000-1000-8000-00805f9b34fb"



const NORBERT_PRIMARY_SERVICE_UUID = "3718ed86-d31a-11ed-afa1-0242ac120002"
const NORBERT_RSSI_CHARACTERISTIC_UUID = "3718ed87-d31a-11ed-afa1-0242ac120002"

// sensors

const NORBERT_SENSORS_BT_UUID_PRIMARY = "3718ed00-d31a-11ed-afa1-0242ac120002"
const NORBERT_SENSORS_CHARACTERISTIC_FSR_UUID = "3718ed01-d31a-11ed-afa1-0242ac120002"
const NORBERT_SENSORS_CHARACTERISTIC_TEMP1_UUID = "3718ed02-d31a-11ed-afa1-0242ac120002"
const NORBERT_SENSORS_CHARACTERISTIC_TEMP2_UUID = "3718ed03-d31a-11ed-afa1-0242ac120002"
const NORBERT_SENSORS_CHARACTERISTIC_ACC_UUID = "3718ed04-d31a-11ed-afa1-0242ac120002"

const NORBERT_SUPPORTED_PREFIX = ["BLOOM"]

/** Event listeners */
// connect button
document.querySelector('#btn_connect').addEventListener('click', function () {
  if (isWebBluetoothEnabled()) {
    onButtonClick();
  }
});

document.querySelector('#btn_start_exercise').addEventListener('click', function () {
  if (isWebBluetoothEnabled()) {
    onStartExerciseButtonClick();
  }
});

document.querySelector("#forgetBluetoothDevice").addEventListener('click', function () {
  if (isWebBluetoothEnabled()) {
    onForgetBluetoothDeviceButtonClick();
  }
});


function onForgetBluetoothDeviceButtonClick() {
  try {
    navigator.bluetooth.getDevices()
      .then(devices => {
        const deviceIdToForget = document.querySelector('#devicesSelect').value;
        const device = devices.find((device) => device.id == deviceIdToForget);
        if (!device) {
          throw new Error('No Bluetooth device to forget');
        }
        console.log('Forgetting ' + device.name + 'Bluetooth device...');
        return device.forget();
      })
      .then(() => {
        console.log('  > Bluetooth device has been forgotten.');
        populateBluetoothDevices(NORBERT_SUPPORTED_PREFIX);
      })
      .catch(error => {
        console.log('Argh! ' + error);
      });
  }
  catch {
    //not supported
    console.log("Not supported")
  }

}

window.onload = () => {
  populateBluetoothDevices(NORBERT_SUPPORTED_PREFIX);
};



var file_name = "";
var csv_contents = "";
/** Button handlers */
function onStartExerciseButtonClick() {
  if (recording) {
    recording = false;
    document.getElementById("btn_start_exercise").innerHTML = "Start Exercise";
    file_name = document.getElementById("exercise_prefix").value;
    file_name += document.getElementById("exercise_name").value + "_" + getCurrentTimestamp() + ".csv";
    document.getElementById("exercise_name").disabled = false;
    writeToFile(csv_contents, file_name);
    var a = document.getElementById("downloadLink")
    a.hidden = false;
    var options = document.getElementById("exercise_prefix");
    options.disabled = false;

  } else {
    csv_contents = "";
    var a = document.getElementById("downloadLink")
    a.hidden = true;
    var options = document.getElementById("exercise_prefix");
    options.disabled = true;

    document.getElementById("exercise_name").disabled = true;
    recording = true;
    document.getElementById("btn_start_exercise").innerHTML = "Stop Exercise";
  }
}


// send command to device
onCmdButtonClick = function () {
  write_characteristic(device, NORDIC_UART_SERVICE_UUID, NORDIC_UART_RX_CHARACTERISTIC_UUID, document.getElementById("cmd_rx").value);
}

function saveAs(blob, name) {
  // prompt user to save file
  var a = document.createElement("a");
  document.body.appendChild(a);
  var a = document.getElementById("downloadLink")
  a.hidden = false;
  var url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  document.getElementById("downloadLink").hidden = false;
}


function writeToFile(data, name) {
  var blob = new Blob([data], { type: "text/plain;charset=utf-8" });

  //save the blob to a file
  saveAs(blob, name);

}

var last_quats = [];
var last_fsr = [];
var last_rssi = [];
var last_temp1 = [];
var last_temp2 = [];

function handle_all_notifications(event) {

  if (event.target.uuid == NORBERT_SENSORS_CHARACTERISTIC_ACC_UUID) {
    last_quats = handle_acc(event);
    if (recording) {
      csv_contents += getCurrentTimestamp() + ", " + last_quats + "," + last_fsr + "," + last_rssi + "," + last_temp1 + "," + last_temp2 + ", ACC\n";
    }
  } else if (event.target.uuid == NORBERT_SENSORS_CHARACTERISTIC_FSR_UUID) {
    last_fsr = handle_fsr(event);
    console.log("received fsr callbaclk")
    if (recording) {
      csv_contents += getCurrentTimestamp() + ", " + last_quats + "," + last_fsr + "," + last_rssi + "," + last_temp1 + "," + last_temp2 + ", FSR\n";
    }
  }
  else if (event.target.uuid == NORBERT_RSSI_CHARACTERISTIC_UUID) {
    last_rssi = handle_rssi(event);
    console.log("received rssi callback");
    if (recording) {
      csv_contents += getCurrentTimestamp() + ", " + last_quats + "," + last_fsr + "," + last_rssi + "," + last_temp1 + "," + last_temp2 + ", RSSI\n";
    }
  }
  else if (event.target.uuid == NORBERT_SENSORS_CHARACTERISTIC_TEMP1_UUID) {
    last_temp1 = handle_temp1(event);
    console.log("received temp1 callback");
    if (recording) {
      csv_contents += getCurrentTimestamp() + ", " + last_quats + "," + last_fsr + "," + last_rssi + "," + last_temp1 + "," + last_temp2 + ", TEMP1\n";
    }
  }
  else if (event.target.uuid == NORBERT_SENSORS_CHARACTERISTIC_TEMP2_UUID) {
    last_temp2 = handle_temp2(event);
    console.log("received temp2 callback");
    if (recording) {
      csv_contents += getCurrentTimestamp() + ", " + last_quats + "," + last_fsr + "," + last_rssi + "," + last_temp1 + "," + last_temp2 + ", TEMP2\n";
    }
  }
}

async function onButtonClick() {
  console.log('Requesting any Bluetooth Device...');

  device = await getDevice(["BLOOM"], [NORBERT_PRIMARY_SERVICE_UUID, NORBERT_SENSORS_BT_UUID_PRIMARY]);
  populateBluetoothDevices(NORBERT_SUPPORTED_PREFIX);


  subscribe_characteristic(device, NORBERT_PRIMARY_SERVICE_UUID, NORBERT_RSSI_CHARACTERISTIC_UUID, handle_all_notifications);
  subscribe_characteristic(device, NORBERT_SENSORS_BT_UUID_PRIMARY, NORBERT_SENSORS_CHARACTERISTIC_FSR_UUID, handle_all_notifications);
  subscribe_characteristic(device, NORBERT_SENSORS_BT_UUID_PRIMARY, NORBERT_SENSORS_CHARACTERISTIC_ACC_UUID, handle_all_notifications);

  //subscribe_characteristic(device, NORBERT_SENSORS_BT_UUID_PRIMARY, NORBERT_SENSORS_CHARACTERISTIC_TEMP1_UUID, handle_all_notifications);
  //subscribe_characteristic(device, NORBERT_SENSORS_BT_UUID_PRIMARY, NORBERT_SENSORS_CHARACTERISTIC_TEMP2_UUID, handle_all_notifications);
  //subscribe_characteristic(device, NORBERT_ACC_SERVICE_UUID, NORBERT_ACC_CHARACTERISTIC_UUID, handle_all_notifications);
  //subscribe_characteristic(device, NORBERT_FSR_SERVICE_UUID, NORBERT_FSR_CHARACTERISTIC_UUID, handle_all_notifications);

  return 0;
}


/** Bluetooth functionalities */

function isWebBluetoothEnabled() {
  if (navigator.bluetooth) {
    return true;
  } else {
    console.log('Web Bluetooth API is not available.\n' +
      'Please make sure the "Experimental Web Platform features" flag is enabled.');
    return false;
  }
}

/** Miscellaneous functions */

function getCurrentTimestamp() {
  return Date.now()
}


function addData(chart, x, y, z) {

  var line_x = chart.data.datasets[0].data;
  var line_y = chart.data.datasets[1].data;
  var line_z = chart.data.datasets[2].data;

  // remove oldest data point from chart if there are more than MAX_LENGTH
  if (chart.data.datasets[0].data.length > MAX_LENGTH_ACC) {
    line_x.shift();
    line_y.shift();
    line_z.shift();
  }

  line_x.push(x);
  line_y.push(y);
  line_z.push(z);

  chart.data.datasets[0].data = line_x
  chart.data.datasets[1].data = line_y
  chart.data.datasets[2].data = line_z


  chart.update();
}

function addDataFSR(chart, fsr1_value, fsr2_value) {

  var fsr1 = chart.data.datasets[0].data;
  var fsr2 = chart.data.datasets[1].data;


  if (chart.data.datasets[0].data.length > MAX_LENGTH_FSR) {
    fsr1.shift();
    fsr2.shift();
  }

  fsr1.push(fsr1_value);
  fsr2.push(fsr2_value);


  document.getElementById("fsr1_value").innerHTML = "FSR1: " + fsr1_value;
  document.getAnimations("fsr2_value").innerHTML = "FSR2: " + fsr2_value;

  chart.data.datasets[0].data = fsr1;
  chart.data.datasets[1].data = fsr2;

  chart.update();
}


function removeData(chart) {

  chart.datasets[0]
  //chart.data.labels.pop();
  chart.data.datasets.forEach((dataset) => {
    dataset.data.pop();
  });
  chart.update();
}

/** Notification Handlers */
function handle_acc(event) {

  let value = event.target.value;

  console.log(value);

  x_raw_0 = value.getInt32(4, littleEndian = true);
  x_raw_1 = value.getInt32(8, littleEndian = true);
  y_raw_0 = value.getInt32(12, littleEndian = true);
  y_raw_1 = value.getInt32(16, littleEndian = true);
  z_raw_0 = value.getInt32(20, littleEndian = true);
  z_raw_1 = value.getInt32(24, littleEndian = true);


  x_raw = x_raw_0 + x_raw_1 / 1000000;
  y_raw = y_raw_0 + y_raw_1 / 1000000;
  z_raw = z_raw_0 + z_raw_1 / 1000000;

  // from ms^-2 to g
  x_raw = x_raw / 9.8;
  y_raw = y_raw / 9.8;
  z_raw = z_raw / 9.8;


  x = x_raw;
  y = y_raw;
  z = z_raw;

  // vector magnitude
  //console.log(Math.sqrt(x * x + y * y + z * z))

  addData(chart_acc, x, y, z);
  let values = [x_raw, y_raw, z_raw];
  return values;
}

function handle_rssi(event) {
  let value = event.target.value;

  rssi = value.getInt8(0, littleEndian = true);
  console.log(rssi);

  document.getElementById("rssi").innerHTML = rssi;

  return rssi;
}


function handle_fsr(event) {
  let value = event.target.value;

  fsr1_value = value.getInt32(4, littleEndian = true);
  fsr2_value = 0;// value.getInt16(0, littleEndian = false);



  addDataFSR(myChart_fsr, fsr1_value, fsr2_value);

  let values = [fsr1_value, fsr2_value];

  return values;

}

function handle_temp1(event) {
  let value = event.target.value;

  temp1_value = value.getInt32(0, littleEndian = true);

  temp1 = temp1_value / 100 + temp1_value % 100 / 100;

  document.getElementById("temp1").innerHTML = temp1;

  return temp1;
}

function handle_temp2(event) {
  let value = event.target.value;


  temp2_value = value.getInt32(0, littleEndian = true);

  temp2 = temp2_value / 100 + temp2_value % 100 / 100;

  document.getElementById("temp2").innerHTML = temp2;

  return temp2;
}


function handle_cmd(event) {
  console.log("cmd response received")
  let value = event.target.value;

  const textDecoder = new TextDecoder('utf-8');
  value = textDecoder.decode(value);
  console.log(value)

  document.getElementById("cmd_tx").innerHTML = value;

  return value;
}
