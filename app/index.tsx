import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from './api/client'; // atau path sesuai tempat kamu simpan client axios

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password wajib diisi');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/api/auth/login', { email, password });
      const { token } = res.data;
      await AsyncStorage.setItem('token', token);
      router.replace('/dashboard');
    } catch (err: any) {
      console.log(err.response?.data || err.message);
      Alert.alert('Login gagal', 'Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#EEF2FF' }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 }}>
        Expense Apps
      </Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ backgroundColor: 'white', borderRadius: 8, padding: 12, marginBottom: 12 }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ backgroundColor: 'white', borderRadius: 8, padding: 12, marginBottom: 16 }}
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{
          backgroundColor: '#2563EB',
          borderRadius: 8,
          paddingVertical: 12,
          alignItems: 'center',
        }}
      >
        {loading ? <ActivityIndicator color="#FFF" /> : (
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
