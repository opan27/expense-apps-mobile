// app/expense-add.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from './api/client';

type Installment = {
  id: number;
  name: string;
  monthly_payment: number;
  remaining_months: number;
  status: 'active' | 'closed' | 'deleted';
};

export default function ExpenseAddScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // kalau ada id -> mode edit
  const isEdit = !!id;

  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [installmentId, setInstallmentId] = useState<string>(''); // <-- id cicilan
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // load cicilan aktif
  const loadInstallments = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }
      const res = await api.get('/api/installments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list: Installment[] = (res.data || []).filter(
        (i: Installment) => i.status === 'active',
      );
      setInstallments(list);
    } catch (err: any) {
      console.log('load installments error:', err.response?.data || err.message);
    }
  };

  // kalau edit, load detail expense
  useEffect(() => {
    const loadDetail = async () => {
      if (!isEdit) return;
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          router.replace('/');
          return;
        }
        const res = await api.get(`/api/expense/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data;

        setCategory(data.category ?? '');
        setAmount(String(Number(data.amount ?? 0)));
        setInstallmentId(data.installment_id ? String(data.installment_id) : '');
        const d = data.date;
        if (d) {
          const dt = new Date(d);
          const yyyy = dt.getFullYear();
          const mm = String(dt.getMonth() + 1).padStart(2, '0');
          const dd = String(dt.getDate()).padStart(2, '0');
          setDate(`${yyyy}-${mm}-${dd}`);
        }
      } catch (err: any) {
        console.log('load expense detail error:', err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    loadInstallments();
    loadDetail();
  }, [id]);

  const handleChangeDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'set' && selected) {
      const iso = selected.toISOString().slice(0, 10);
      setDate(iso);
    }
    if (Platform.OS !== 'ios') setShowDatePicker(false);
  };

  // kalau pilih cicilan -> isi otomatis amount & category
  const handleSelectInstallment = (value: string) => {
    setInstallmentId(value);
    if (value) {
      const selected = installments.find((i) => String(i.id) === value);
      if (selected) {
        setAmount(String(selected.monthly_payment));
        setCategory('cicilan');
      }
    } else {
      // reset kalau user ganti ke "bukan cicilan"
      setAmount('');
      setCategory('');
    }
  };

  const handleSave = async () => {
    if (!category || !amount || !date) {
      Alert.alert('Error', 'Kategori, nominal, dan tanggal wajib diisi');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const payload = {
        category,
        amount: Number(amount),
        date,
        installment_id: installmentId ? Number(installmentId) : null,
      };

      if (isEdit) {
        await api.put(`/api/expense/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post('/api/expense', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      Alert.alert(
        'Sukses',
        `Expense berhasil di${isEdit ? 'update' : 'tambahkan'}`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/expense'),
          },
        ],
      );
    } catch (err: any) {
      console.log('save expense error:', err.response?.data || err.message);
      Alert.alert('Error', 'Gagal menyimpan expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FEF2F2' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 40,
          paddingBottom: 24,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/expense')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#D1D5DB',
              marginRight: 12,
              backgroundColor: 'white',
            }}
          >
            <Text style={{ fontSize: 12, color: '#4B5563' }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#991B1B' }}>
            {isEdit ? 'Edit Expense' : 'Tambah Expense'}
          </Text>
        </View>

        {/* Card form */}
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
          }}
        >
          {/* Kategori */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: '#4B5563',
              marginBottom: 6,
            }}
          >
            Kategori
          </Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder={
              installmentId ? 'cicilan (otomatis)' : 'Misal: Makan, Transport'
            }
            editable={!installmentId} // kalau cicilan, biar luk default cicilan
            placeholderTextColor="#9CA3AF"
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 14,
              fontSize: 14,
            }}
          />

          {/* Nominal */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: '#4B5563',
              marginBottom: 6,
            }}
          >
            Nominal
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder={
              installmentId
                ? 'Terisi otomatis dari cicilan'
                : 'Misal: 150000'
            }
            editable={!installmentId}
            placeholderTextColor="#9CA3AF"
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 14,
              fontSize: 14,
            }}
          />

          {/* Tanggal */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: '#4B5563',
              marginBottom: 6,
            }}
          >
            Tanggal
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 20,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, color: '#111827' }}>{date}</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Pilih</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={new Date(date)}
              mode="date"
              display="calendar"
              onChange={handleChangeDate}
            />
          )}

          {/* Cicilan (opsional) */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: '#4B5563',
              marginBottom: 6,
            }}
          >
            Cicilan (opsional)
          </Text>
          <View
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              marginBottom: 8,
            }}
          >
            <PickerLike
              value={installmentId}
              onChange={handleSelectInstallment}
              installments={installments}
            />
          </View>
          {!!installmentId && (
            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
              Nominal dan kategori otomatis mengikuti cicilan yang dipilih.
            </Text>
          )}

          {/* Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={{
              backgroundColor: '#EF4444',
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text
                style={{ color: 'white', fontWeight: '600', fontSize: 15 }}
              >
                {isEdit ? 'Update Expense' : 'Simpan'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Komponen picker sederhana pakai Touchable, biar tidak tergantung lib lain.
 * Kalau mau, boleh diganti ke @react-native-picker/picker.
 */
type PickerProps = {
  value: string;
  onChange: (val: string) => void;
  installments: Installment[];
};

function PickerLike({ value, onChange, installments }: PickerProps) {
  const [open, setOpen] = useState(false);

  const selected = installments.find((i) => String(i.id) === value);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen((prev) => !prev)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 14, color: '#111827' }}>
          {selected
            ? `${selected.name} - Rp ${selected.monthly_payment.toLocaleString(
                'id-ID',
              )} (${selected.remaining_months} bulan)`
            : 'Bukan pembayaran cicilan'}
        </Text>
        <Text style={{ fontSize: 12, color: '#6B7280' }}>
          {open ? 'Tutup' : 'Pilih'}
        </Text>
      </TouchableOpacity>

      {open && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            paddingHorizontal: 12,
            paddingBottom: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              onChange('');
              setOpen(false);
            }}
            style={{ paddingVertical: 6 }}
          >
            <Text style={{ fontSize: 14, color: '#111827' }}>
              Bukan pembayaran cicilan
            </Text>
          </TouchableOpacity>
          {installments.map((inst) => (
            <TouchableOpacity
              key={inst.id}
              onPress={() => {
                onChange(String(inst.id));
                setOpen(false);
              }}
              style={{ paddingVertical: 6 }}
            >
              <Text style={{ fontSize: 14, color: '#111827' }}>
                {inst.name} - Rp{' '}
                {inst.monthly_payment.toLocaleString('id-ID')} (
                {inst.remaining_months} bulan)
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
