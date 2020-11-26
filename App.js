import React, {Component} from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  Button,
  ScrollView,
  DeviceEventEmitter,
  NativeEventEmitter,
  Switch,
  TouchableOpacity,
  Dimensions,
  ToastAndroid,
  Alert,
} from 'react-native';
import {
  BluetoothEscposPrinter,
  BluetoothManager,
} from 'react-native-bluetooth-escpos-printer';
import ToastExample from './ToastExample';

const {width} = Dimensions.get('window');
export default class App extends Component {
  _listeners = [];
  constructor(props) {
    super(props);
    this.state = {
      devices: null,
      pairedDs: [],
      foundDs: [],
      bleOpend: false,
      loading: true,
      boundAddress: '',
      debugMsg: '',
    };
  }

  componentDidMount() {
    BluetoothManager.isBluetoothEnabled().then(
      (enabled) => {
        this.setState({
          bleOpend: Boolean(enabled),
          loading: false,
        });
      },
      (err) => {
        err;
      },
    );

    if (Platform.OS === 'ios') {
      let bluetoothManagerEmitter = new NativeEventEmitter(BluetoothManager);
      this._listeners.push(
        bluetoothManagerEmitter.addListener(
          BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED,
          (rsp) => {
            this._deviceAlreadPaired(rsp);
          },
        ),
      );
      this._listeners.push(
        bluetoothManagerEmitter.addListener(
          BluetoothManager.EVENT_DEVICE_FOUND,
          (rsp) => {
            this._deviceFoundEvent(rsp);
          },
        ),
      );
      this._listeners.push(
        bluetoothManagerEmitter.addListener(
          BluetoothManager.EVENT_CONNECTION_LOST,
          () => {
            this.setState({
              name: '',
              boundAddress: '',
            });
          },
        ),
      );
    } else if (Platform.OS === 'android') {
      this._listeners.push(
        DeviceEventEmitter.addListener(
          BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED,
          (rsp) => {
            this._deviceAlreadPaired(rsp);
          },
        ),
      );
      this._listeners.push(
        DeviceEventEmitter.addListener(
          BluetoothManager.EVENT_DEVICE_FOUND,
          (rsp) => {
            this._deviceFoundEvent(rsp);
          },
        ),
      );
      this._listeners.push(
        DeviceEventEmitter.addListener(
          BluetoothManager.EVENT_CONNECTION_LOST,
          () => {
            this.setState({
              name: '',
              boundAddress: '',
            });
          },
        ),
      );
      this._listeners.push(
        DeviceEventEmitter.addListener(
          BluetoothManager.EVENT_BLUETOOTH_NOT_SUPPORT,
          () => {
            ToastAndroid.show(
              'Device Not Support Bluetooth !',
              ToastAndroid.LONG,
            );
          },
        ),
      );
    }
  }

  _deviceAlreadPaired(rsp) {
    var ds = null;
    if (typeof rsp.devices === 'object') {
      ds = rsp.devices;
    } else {
      try {
        ds = JSON.parse(rsp.devices);
      } catch (e) {}
    }
    if (ds && ds.length) {
      let pared = this.state.pairedDs;
      pared = pared.concat(ds || []);
      this.setState({
        pairedDs: pared,
      });
    }
  }

  _deviceFoundEvent(rsp) {
    var r = null;
    try {
      if (typeof rsp.device === 'object') {
        r = rsp.device;
      } else {
        r = JSON.parse(rsp.device);
      }
    } catch (e) {
      //alert(e.message);
      //ignore
    }
    //alert('f')
    if (r) {
      let found = this.state.foundDs || [];
      if (found.findIndex) {
        let duplicated = found.findIndex(function (x) {
          return x.address == r.address;
        });
        //CHECK DEPLICATED HERE...
        if (duplicated == -1) {
          found.push(r);
          this.setState({
            foundDs: found,
          });
        }
      }
    }
  }

  _renderRow(rows) {
    let items = [];
    for (let i in rows) {
      let row = rows[i];
      if (row.address) {
        items.push(
          <TouchableOpacity
            key={new Date().getTime() + i}
            style={styles.wtf}
            onPress={() => {
              this.setState({
                loading: true,
              });
              BluetoothManager.connect(row.address).then(
                (s) => {
                  this.setState({
                    loading: false,
                    boundAddress: row.address,
                    name: row.name || 'UNKNOWN',
                  });
                },
                (e) => {
                  this.setState({
                    loading: false,
                  });
                  alert(e);
                },
              );
            }}>
            <Text style={styles.name}>{row.name || 'UNKNOWN'}</Text>
            <Text style={styles.address}>{row.address}</Text>
          </TouchableOpacity>,
        );
      }
    }
    return items;
  }

  _printSomething = async () => {
    const getAddr = this.state.boundAddress;
    BluetoothManager.connect(getAddr).then(
      async (s) => {
        await BluetoothEscposPrinter.printText('Hello World\n\r', {
          encoding: 'GBK',
          codepage: 0,
          widthtimes: 3,
          heigthtimes: 3,
          fonttype: 1,
        });
        Alert.alert(getAddr);
      },
      (e) => {
        this.setState({
          loading: false,
        });
        alert(e);
      },
    );
  };

  render() {
    return (
      <ScrollView style={styles.container}>
        <Text>{this.state.debugMsg}</Text>
        <Text>{JSON.stringify(this.state, null, 3)}</Text>
        <Text style={styles.title}>
          상태 : {this.state.bleOpend ? 'true' : 'false'}{' '}
        </Text>
        <View>
          <Switch
            value={this.state.bleOpend}
            onValueChange={(v) => {
              this.setState({
                loading: true,
              });
              if (!v) {
                BluetoothManager.disableBluetooth().then(
                  () => {
                    this.setState({
                      bleOpend: false,
                      loading: false,
                      foundDs: [],
                      pairedDs: [],
                    });
                  },
                  (err) => {
                    alert(err);
                  },
                );
              } else {
                BluetoothManager.enableBluetooth().then(
                  (r) => {
                    var paired = [];
                    if (r && r.length > 0) {
                      for (var i = 0; i < r.length; i++) {
                        try {
                          paired.push(JSON.parse(r[i]));
                        } catch (e) {
                          //ignore
                        }
                      }
                    }
                    this.setState({
                      bleOpend: true,
                      loading: false,
                      pairedDs: paired,
                    });
                  },
                  (err) => {
                    this.setState({
                      loading: false,
                    });
                    alert(err);
                  },
                );
              }
            }}
          />
          <Button
            disabled={this.state.loading || !this.state.bleOpend}
            onPress={() => {
              this._scan();
            }}
            title="Scan"
          />
        </View>
        <Text style={styles.title}>
          연결 된 장치:
          <Text style={{color: 'blue'}}>
            {!this.state.name ? '없음' : this.state.name}
          </Text>
        </Text>
        <Text style={styles.title}>Found(tap to connect):</Text>
        {this.state.loading ? (
          <ActivityIndicator size="small" color="#0000ff" animating={true} />
        ) : null}
        <View style={{flex: 1, flexDirection: 'column'}}>
          {this._renderRow(this.state.foundDs)}
        </View>
        <Text style={styles.title}>Paired:</Text>
        {this.state.loading ? (
          <ActivityIndicator size="small" color="#0000ff" animating={true} />
        ) : null}
        <View style={{flex: 1, flexDirection: 'column'}}>
          {this._renderRow(this.state.pairedDs)}
        </View>

        <Text>{''}</Text>

        <Button
          title="프린트 ESC"
          onPress={async () => {
            try {
              await BluetoothEscposPrinter.printText(
                '------------------------------\r\n',
                {},
              );
              await BluetoothEscposPrinter.printText('Hello Welcom', {});
              await BluetoothEscposPrinter.printText(
                '------------------------------\r\n',
                {},
              );

              // await BluetoothEscposPrinter.printBarCode(
              //   '123456789012',
              //   BluetoothEscposPrinter.BARCODETYPE.JAN13,
              //   3,
              //   120,
              //   0,
              //   2,
              // );
              // await BluetoothEscposPrinter.printText('\r\n\r\n\r\n', {});
            } catch (e) {
              alert(e.message || 'ERROR');
            }
          }}
        />

        <Text>{''}</Text>

        <Button
          title="네이티브 TOAST"
          onPress={() => {
            ToastExample.show('에그스토리..', ToastExample.SHORT);
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            paddingVertical: 30,
          }}
        />
      </ScrollView>
    );
  }

  _scan() {
    this.setState({
      loading: true,
    });
    BluetoothManager.scanDevices().then(
      (s) => {
        var ss = s;
        var found = ss.found;
        try {
          found = JSON.parse(found); //@FIX_it: the parse action too weired..
        } catch (e) {
          //ignore
        }
        var fds = this.state.foundDs;
        if (found && found.length) {
          fds = found;
        }
        this.setState({
          foundDs: fds,
          loading: false,
        });
      },
      (er) => {
        this.setState({
          loading: false,
        });
        alert('error' + JSON.stringify(er));
      },
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },

  title: {
    width: width,
    backgroundColor: '#eee',
    color: '#232323',
    paddingLeft: 8,
    paddingVertical: 4,
    textAlign: 'left',
  },
  wtf: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    textAlign: 'left',
  },
  address: {
    flex: 1,
    textAlign: 'right',
  },
});
