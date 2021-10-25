/*
============================================================
BlueJelly.js
============================================================
Web Bluetooth API Wrapper Library

Copyright 2017 JellyWare Inc.
http://jellyware.jp/
This software is released under the MIT License.

Web Bluetooth API
https://webbluetoothcg.github.io/web-bluetooth/
*/

//--------------------------------------------------
//BlueJelly constructor
//--------------------------------------------------
var BlueJelly = function(){
  this.bluetoothDevice = null;
  this.dataCharacteristic = null;
  this.hashUUID ={};
  this.hashUUID_lastConnected;

  //callBack
  this.onScan = function(deviceName){console.log("onScan");};
  this.onConnectGATT = function(uuid){console.log("onConnectGATT");};
  this.onRead = function(data, uuid){console.log("onRead");};
  this.onWrite = function(uuid){console.log("onWrite");};
  this.onStartNotify = function(uuid){console.log("onStartNotify");};
  this.onStopNotify = function(uuid){console.log("onStopNotify");};
  this.onDisconnect = function(){console.log("onDisconnect");};
  this.onClear = function(){console.log("onClear");};
  this.onReset = function(){console.log("onReset");};
  this.onError = function(error){console.log("onError");};
}


//--------------------------------------------------
//setUUID
//--------------------------------------------------
BlueJelly.prototype.setUUID = function(name, serviceUUID, characteristicUUID){
  console.log('Execute : setUUID');
  console.log(this.hashUUID);

  this.hashUUID[name] = {'serviceUUID':serviceUUID, 'characteristicUUID':characteristicUUID};
}


//--------------------------------------------------
//scan
//--------------------------------------------------
BlueJelly.prototype.scan = function(uuid){
  return (this.bluetoothDevice ? Promise.resolve() : this.requestDevice(uuid))
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//requestDevice
//--------------------------------------------------
BlueJelly.prototype.requestDevice = function(uuid) {
  console.log('Execute : requestDevice');
  return navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [this.hashUUID[uuid].serviceUUID]})
  .then(device => {
    this.bluetoothDevice = device;
    this.bluetoothDevice.addEventListener('gattserverdisconnected', this.onDisconnect);
    this.onScan(this.bluetoothDevice.name);
  });
}


//--------------------------------------------------
//connectGATT
//--------------------------------------------------
BlueJelly.prototype.connectGATT = function(uuid) {
  if(!this.bluetoothDevice)
  {
    var error = "No Bluetooth Device";
    console.log('Error : ' + error);
    this.onError(error);
    return;
  }
  if (this.bluetoothDevice.gatt.connected && this.dataCharacteristic) {
    if(this.hashUUID_lastConnected == uuid)
      return Promise.resolve();
  }
  this.hashUUID_lastConnected = uuid;

  console.log('Execute : connect');
  return this.bluetoothDevice.gatt.connect()
  .then(server => {
    console.log('Execute : getPrimaryService');
    return server.getPrimaryService(this.hashUUID[uuid].serviceUUID);
  })
  .then(service => {
    console.log('Execute : getCharacteristic');
    return service.getCharacteristic(this.hashUUID[uuid].characteristicUUID);
  })
  .then(characteristic => {
    this.dataCharacteristic = characteristic;
    this.dataCharacteristic.addEventListener('characteristicvaluechanged',this.dataChanged(this, uuid));
    this.onConnectGATT(uuid);
  })
  .catch(error => {
      console.log('Error : ' + error);
      this.onError(error);
    });
}


//--------------------------------------------------
//dataChanged
//--------------------------------------------------
BlueJelly.prototype.dataChanged = function(self, uuid) {
  return function(event) {
    self.onRead(event.target.value, uuid);
  }
}


//--------------------------------------------------
//read
//--------------------------------------------------
BlueJelly.prototype.read= function(uuid) {
  return (this.scan(uuid))
  .then( () => {
    return this.connectGATT(uuid);
  })
  .then( () => {
    console.log('Execute : readValue');
    return this.dataCharacteristic.readValue();
  })
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//write
//--------------------------------------------------
BlueJelly.prototype.write = function(uuid, array_value) {
  return (this.scan(uuid))
  .then( () => {
    return this.connectGATT(uuid);
  })
  .then( () => {
    console.log('Execute : writeValue');
    data = Uint8Array.from(array_value);
    return this.dataCharacteristic.writeValue(data);
  })
  .then( () => {
    this.onWrite(uuid);
  })
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//startNotify
//--------------------------------------------------
BlueJelly.prototype.startNotify = function(uuid) {
  return (this.scan(uuid))
  .then( () => {
    return this.connectGATT(uuid);
  })
  .then( () => {
    console.log('Execute : startNotifications');
    this.dataCharacteristic.startNotifications()
  })
  .then( () => {
    this.onStartNotify(uuid);
  })
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//stopNotify
//--------------------------------------------------
BlueJelly.prototype.stopNotify = function(uuid){
  return (this.scan(uuid))
  .then( () => {
    return this.connectGATT(uuid);
  })
  .then( () => {
  console.log('Execute : stopNotifications');
  this.dataCharacteristic.stopNotifications()
})
  .then( () => {
    this.onStopNotify(uuid);
  })
  .catch(error => {
    console.log('Error : ' + error);
    this.onError(error);
  });
}


//--------------------------------------------------
//disconnect
//--------------------------------------------------
BlueJelly.prototype.disconnect= function() {
  if (!this.bluetoothDevice) {
    var error = "No Bluetooth Device";
    console.log('Error : ' + error);
    this.onError(error);
    return;
  }

  if (this.bluetoothDevice.gatt.connected) {
    console.log('Execute : disconnect');
    this.bluetoothDevice.gatt.disconnect();
  } else {
   var error = "Bluetooth Device is already disconnected";
   console.log('Error : ' + error);
   this.onError(error);
   return;
  }
}


//--------------------------------------------------
//clear
//--------------------------------------------------
BlueJelly.prototype.clear= function() {
   console.log('Excute : Clear Device and Characteristic');
   this.bluetoothDevice = null;
   this.dataCharacteristic = null;
   this.onClear();
}


//--------------------------------------------------
//reset(disconnect & clear)
//--------------------------------------------------
BlueJelly.prototype.reset= function() {
  console.log('Excute : reset');
  this.disconnect(); //disconnect() is not Promise Object
  this.clear();
  this.onReset();
}

//--------------------------------------------------
//SensorTag UUID(class constant)
//--------------------------------------------------
Object.defineProperty(BlueJelly, 'SERVICE_UUID', {value: "a6ad91bd-376e-465f-8c6c-460fd3e15038", writable: false});
Object.defineProperty(BlueJelly, 'CHARACTERISTICS_CHAR_DATA', {value: "80d881a6-1ab3-47f0-8c75-2c31eac31f43", writable: false});
Object.defineProperty(BlueJelly, 'CHARACTERISTICS_CHAR_ENABLE', {value: "f000aa02-0451-4000-b000-000000000000", writable: false});
Object.defineProperty(BlueJelly, 'CHARACTERISTICS_CHAR_PERIOD', {value: "f000aa03-0451-4000-b000-000000000000", writable: false});