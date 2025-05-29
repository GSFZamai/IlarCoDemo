/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import BleManager, {Peripheral, BleState} from 'react-native-ble-manager';

function App(): React.JSX.Element {
  const [moduleInitialized, setModuleInitilized] = useState(false);
  const [moduleState, setModuleState] = useState<string>();
  const [initializingModule, setinitializingModule] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [peripheralsList, setPeripheralsList] = useState<Peripheral[]>();
  const [boundedPeripheralList, setBoundedPeripheralList] =
    useState<Peripheral[]>();
  const [connectedPeripheralList, setConnectedPeripheralList] =
    useState<Peripheral[]>();

  const initializeModule = async () => {
    try {
      setinitializingModule(true);
      const initialState = await BleManager.checkState();
      setModuleState(initialState);
      await BleManager.start();
      await BleManager.enableBluetooth();
      const finalState = await BleManager.checkState();
      setModuleState(finalState);
      setModuleInitilized(true);
    } catch (e) {
    } finally {
      setinitializingModule(false);
    }
  };

  const handleStartScan = async () => {
    setPeripheralsList(undefined);
    setBoundedPeripheralList(undefined);
    setConnectedPeripheralList(undefined);
    try {
      setScanning(true);

      const permission = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS['BLUETOOTH_SCAN'],
        PermissionsAndroid.PERMISSIONS['BLUETOOTH_CONNECT'],
        PermissionsAndroid.PERMISSIONS['BLUETOOTH_ADVERTISE'],
      ]);

      if (
        permission['android.permission.BLUETOOTH_CONNECT'] === 'denied' ||
        permission['android.permission.BLUETOOTH_SCAN'] === 'denied'
      )
        Alert.alert('Bluetooth', 'Permission needed');

      const boundedDevices = await BleManager.getBondedPeripherals();
      const connectedPeripherals = await BleManager.getConnectedPeripherals();
      setBoundedPeripheralList(boundedDevices);
      setConnectedPeripheralList(connectedPeripherals);

      await BleManager.scan([], 30, false, {
        matchMode: 1,
      });
    } catch (e) {
    } finally {
    }
  };

  const handleStateUpdate = ({state}: {state: BleState}) => {
    setModuleState(state);
  };

  const handleDiscoverPeripheral = (peripheral: Peripheral) => {
    if (!peripheral.advertising.isConnectable) return;
    setPeripheralsList(prev => {
      const newState = prev ?? [];
      if (newState.some(p => p.id === peripheral.id)) {
        return newState;
      }

      return newState.concat(peripheral);
    });
  };

  const handleConnectDevice = async (id: string) => {
    console.log(`Trying to connect to ${id}`);
    try {
      if (Platform.OS === 'android') {
        await BleManager.createBond(id);
      }
      await BleManager.connect(id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDisconnectDevice = async (id: string) => {
    console.log(`Disconnecting ${id}`);
    try {
      await BleManager.disconnect(id, true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopScanning = async () => {
    try {
      const discoveredDevices = await BleManager.getDiscoveredPeripherals();
      setPeripheralsList(discoveredDevices);
    } catch {
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    initializeModule();
  }, []);

  useEffect(() => {
    const onDidUpdateStateListener =
      BleManager.onDidUpdateState(handleStateUpdate);

    const onDiscoverPeripheralListener = BleManager.onDiscoverPeripheral(
      handleDiscoverPeripheral,
    );

    const onStopScanListener = BleManager.onStopScan(handleStopScanning);

    const onConnectListener = BleManager.onConnectPeripheral(() =>
      Alert.alert('Conectado', 'Com sucesso'),
    );

    const onDisconnectListener = BleManager.onDisconnectPeripheral(() =>
      Alert.alert('Desconectado', 'com sucesso'),
    );

    const onPeripheralDidBondListener = BleManager.onPeripheralDidBond(() =>
      Alert.alert('Pareado', 'Com sucesso'),
    );

    return () => {
      onDidUpdateStateListener.remove();
      onDiscoverPeripheralListener.remove();
      onStopScanListener.remove();
      onConnectListener.remove();
      onPeripheralDidBondListener.remove();
      onDisconnectListener.remove();
    };
  }, []);
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
      }}>
      <View>
        <Text>Demo App for IlarCo</Text>
      </View>
      <View>
        {initializingModule ? (
          <Text>'Initializing, please wait...'</Text>
        ) : (
          <Text>
            {moduleInitialized
              ? `Module initialized with state ${moduleState}`
              : 'Module not initialized'}
          </Text>
        )}
      </View>
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{flexGrow: 1, gap: 16}}>
        {(peripheralsList?.length ?? 0) > 0 && (
          <>
            <Text>Available Devices</Text>
            {peripheralsList?.map(peripheral => {
              return (
                <Pressable
                  key={peripheral.id}
                  onPress={() => handleConnectDevice(peripheral.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: 'black',
                    padding: 6,
                    borderRadius: 8,
                  }}>
                  <Text>{peripheral.id}</Text>
                  <Text>
                    {peripheral.advertising.localName ?? peripheral.name}
                  </Text>
                </Pressable>
              );
            })}
          </>
        )}

        {(boundedPeripheralList?.length ?? 0) > 0 && (
          <>
            <Text>Bounded Devices</Text>
            {boundedPeripheralList?.map(peripheral => {
              return (
                <Pressable
                  key={peripheral.id}
                  onPress={() => handleDisconnectDevice(peripheral.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: 'black',
                    padding: 6,
                    borderRadius: 8,
                  }}>
                  <Text>{peripheral.id}</Text>
                  <Text>
                    {peripheral.advertising.localName ?? peripheral.name}
                  </Text>
                </Pressable>
              );
            })}
          </>
        )}

        {(connectedPeripheralList?.length ?? 0) > 0 && (
          <>
            <Text>Connected Devices</Text>
            {connectedPeripheralList?.map(peripheral => {
              return (
                <Pressable
                  key={peripheral.id}
                  onPress={() => handleDisconnectDevice(peripheral.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: 'black',
                    padding: 6,
                    borderRadius: 8,
                  }}>
                  <Text>{peripheral.id}</Text>
                  <Text>
                    {peripheral.advertising.localName ?? peripheral.name}
                  </Text>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
      <View>
        {scanning ? (
          <ActivityIndicator size={10} color="blue" />
        ) : (
          <Button title="Start Scan" onPress={handleStartScan} />
        )}
      </View>
    </View>
  );
}

export default App;
