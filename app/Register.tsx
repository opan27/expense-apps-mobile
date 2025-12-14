import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import api from './api/client';

export default function Register() {
  const router = useRouter();

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'name' | 'email' | 'password' | null>(
    null
  );

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Nama, email, dan password wajib diisi');
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/auth/register', {
        name,
        email,
        password,
      });

      Alert.alert('Berhasil 🎉', 'Registrasi sukses, silakan login', [
        {
          text: 'Login',
          onPress: () => router.replace('/'),
        },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Registrasi gagal';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={styles.container}>
          {/* ATAS: header + card */}
          <View style={styles.topSection}>
            {/* HEADER */}
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Ionicons
                  name="person-add-outline"
                  size={40}
                  color="#16A34A"
                />
              </View>
              <Text style={styles.badgeText}>GET STARTED</Text>
              <Text style={styles.title}>Buat Akun Baru</Text>
              <Text style={styles.subtitle}>
                Mulai kelola keuanganmu dengan rapi
              </Text>
            </View>

            {/* CARD */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Isi data dirimu</Text>

              {/* NAMA */}
              <View
                style={[
                  styles.inputWrapper,
                  focused === 'name' && styles.inputWrapperFocused,
                ]}
              >
                <View style={styles.inputLeft}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#64748B"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Nama lengkap</Text>
                  <TextInput
                    ref={nameRef}
                    placeholder="Nama lengkap"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    returnKeyType="next"
                    autoFocus
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                </View>
              </View>

              {/* EMAIL */}
              <View
                style={[
                  styles.inputWrapper,
                  focused === 'email' && styles.inputWrapperFocused,
                ]}
              >
                <View style={styles.inputLeft}>
                  <Ionicons name="mail-outline" size={20} color="#64748B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    ref={emailRef}
                    placeholder="contoh@email.com"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                    returnKeyType="next"
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              </View>

              {/* PASSWORD */}
              <View
                style={[
                  styles.inputWrapper,
                  focused === 'password' && styles.inputWrapperFocused,
                ]}
              >
                <View style={styles.inputLeft}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#64748B"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    ref={passwordRef}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    returnKeyType="done"
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              {/* BUTTON */}
              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                style={styles.button}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Register</Text>
                )}
              </TouchableOpacity>

              {/* LOGIN */}
              <TouchableOpacity
                onPress={() => router.replace('/')}
                style={styles.login}
              >
                <Text style={styles.loginText}>
                  Sudah punya akun?{' '}
                  <Text style={styles.loginLink}>Login</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FOOTER */}
          <Text style={styles.footerText}>Expense Apps • v1.0.0</Text>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0EAFF',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
    justifyContent: 'space-between', // topSection dan footer nempel atas-bawah
  },
  topSection: {
    // header + card
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoCircle: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    padding: 22,
    borderRadius: 999,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
  },
  inputWrapperFocused: {
    borderColor: '#16A34A',
    backgroundColor: '#ECFDF3',
  },
  inputLeft: {
    marginTop: 8,
    marginRight: 10,
  },
  inputLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  input: {
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
  },
  eyeButton: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
  button: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  login: {
    marginTop: 16,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#64748B',
  },
  loginLink: {
    color: '#16A34A',
    fontWeight: '600',
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
