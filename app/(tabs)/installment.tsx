// app/(tabs)/installment.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';

type Installment = {
  id: number;
  name: string;
  principal: number;
  interest_rate: number;
  monthly_payment: number;
  total_months: number;
  remaining_months: number;
  start_date: string;
  due_day: number;
  status: 'active' | 'closed' | 'deleted';
  notes?: string | null;
};

type Payment = {
  id: number;
  amount: number;
  date: string;
};

type FormState = {
  name: string;
  principal: string;
  interest_rate: string;
  monthly_payment: string;
  total_months: string;
  start_date: string;
  due_day: string;
  status: 'active' | 'closed';
  notes: string;
};

export default function InstallmentScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<Record<number, boolean>>({});
  const [paymentHistory, setPaymentHistory] = useState<Record<number, Payment[]>>({});

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    principal: '',
    interest_rate: '0',
    monthly_payment: '',
    total_months: '',
    start_date: '',
    due_day: '',
    status: 'active',
    notes: '',
  });

  // state untuk DateTimePicker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDateObj, setStartDateObj] = useState<Date>(new Date());

  const getTokenOrRedirect = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      throw new Error('No token');
    }
    return token;
  };

  const loadInstallments = async () => {
    try {
      const token = await getTokenOrRedirect();
      const res = await api.get('/api/installments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInstallments(res.data || []);
    } catch (err: any) {
      if (err.message === 'No token') return;
      console.log('load installments error:', err.response?.data || err.message);
      Alert.alert('Error', 'Gagal mengambil data cicilan');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (instId: number) => {
    if (expandedHistory[instId]) {
      setExpandedHistory((prev) => ({ ...prev, [instId]: false }));
      return;
    }

    try {
      const token = await getTokenOrRedirect();
      const res = await api.get(`/api/installments/${instId}/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPaymentHistory((prev) => ({ ...prev, [instId]: res.data || [] }));
      setExpandedHistory((prev) => ({ ...prev, [instId]: true }));
    } catch (err: any) {
      if (err.message === 'No token') return;
      console.log('load payments error:', err.response?.data || err.message);
      Alert.alert('Error', 'Gagal mengambil histori pembayaran');
    }
  };

  useEffect(() => {
    loadInstallments();
  }, []);

  const formatRupiah = (num: number | string | null | undefined) => {
    if (!num || isNaN(Number(num))) return 'Rp 0';
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  };

  const formatDateId = (iso: string | null | undefined) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const resetForm = () => {
    setForm({
      name: '',
      principal: '',
      interest_rate: '0',
      monthly_payment: '',
      total_months: '',
      start_date: '',
      due_day: '',
      status: 'active',
      notes: '',
    });
    setStartDateObj(new Date());
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangeStartDate = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    if (event.type === 'set' && selected) {
      setStartDateObj(selected);
      const iso = selected.toISOString().slice(0, 10); // YYYY-MM-DD
      setForm((prev) => ({ ...prev, start_date: iso }));
    }
    if (Platform.OS !== 'ios') setShowDatePicker(false);
  };

  const handleSubmit = async () => {
    const payload = {
      name: form.name,
      principal: Number(form.principal),
      interest_rate: Number(form.interest_rate || 0),
      monthly_payment: Number(form.monthly_payment),
      total_months: Number(form.total_months),
      start_date: form.start_date,
      due_day: Number(form.due_day),
      status: form.status,
      notes: form.notes || null,
    };

    if (
      !payload.name ||
      !payload.principal ||
      !payload.monthly_payment ||
      !payload.total_months ||
      !payload.start_date ||
      !payload.due_day
    ) {
      Alert.alert('Validasi', 'Mohon lengkapi semua field wajib.');
      return;
    }

    try {
      const token = await getTokenOrRedirect();
      if (editingId) {
        await api.put(`/api/installments/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post('/api/installments', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setShowModal(false);
      resetForm();
      setLoading(true);
      await loadInstallments();
    } catch (err: any) {
      if (err.message === 'No token') return;
      console.log('save installment error:', err.response?.data || err.message);
      Alert.alert('Error', 'Gagal menyimpan cicilan');
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const token = await getTokenOrRedirect();
      const res = await api.get(`/api/installments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;

      const start = data.start_date ? new Date(data.start_date) : new Date();

      setForm({
        name: String(data.name ?? ''),
        principal: String(data.principal ?? ''),
        interest_rate: String(data.interest_rate ?? '0'),
        monthly_payment: String(data.monthly_payment ?? ''),
        total_months: String(data.remaining_months ?? data.total_months ?? ''),
        start_date: data.start_date ? data.start_date.slice(0, 10) : '',
        due_day: String(data.due_day ?? ''),
        status: data.status === 'closed' ? 'closed' : 'active',
        notes: data.notes ?? '',
      });
      setStartDateObj(start);
      setEditingId(id);
      setShowModal(true);
    } catch (err: any) {
      if (err.message === 'No token') return;
      console.log('get installment error:', err.response?.data || err.message);
      Alert.alert('Error', 'Gagal mengambil detail cicilan');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Konfirmasi',
      'Hapus cicilan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getTokenOrRedirect();
              await api.delete(`/api/installments/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setLoading(true);
              await loadInstallments();
            } catch (err: any) {
              if (err.message === 'No token') return;
              console.log('delete installment error:', err.response?.data || err.message);
              Alert.alert('Error', 'Gagal menghapus cicilan');
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#F3F4FF',
        }}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4FF' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 32,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
            marginTop: 8,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#4C1D95' }}>
              Kelola Cicilan
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              Data cicilan dipakai untuk rekomendasi pembayaran tagihan.
            </Text>
          </View>

          <TouchableOpacity
            onPress={openCreate}
            style={{
              backgroundColor: '#7C3AED',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              flexShrink: 1,
              maxWidth: '30%',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>+ Tambah</Text>
          </TouchableOpacity>
        </View>

        {/* List cicilan */}
        {installments.length === 0 ? (
          <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 40 }}>
            Belum ada cicilan yang tercatat.
          </Text>
        ) : (
          installments.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: 'white',
                borderRadius: 14,
                padding: 12,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontWeight: '700', color: '#111827' }}>{item.name}</Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                    Pokok: {formatRupiah(item.principal)} · Sisa {item.remaining_months} bulan
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                    Bayar per bulan:{' '}
                    <Text style={{ fontWeight: '700', color: '#059669' }}>
                      {formatRupiah(item.monthly_payment)}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                    Bunga: {item.interest_rate}% · Jatuh tempo tiap tanggal {item.due_day}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                    Mulai cicilan: {formatDateId(item.start_date)}
                  </Text>
                  {!!item.notes && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: '#9CA3AF',
                        marginTop: 4,
                      }}
                    >
                      {item.notes}
                    </Text>
                  )}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      fontSize: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      overflow: 'hidden',
                      textTransform: 'capitalize',
                      backgroundColor:
                        item.status === 'active'
                          ? '#DCFCE7'
                          : item.status === 'closed'
                          ? '#E5E7EB'
                          : '#F3F4F6',
                      color:
                        item.status === 'active'
                          ? '#15803D'
                          : item.status === 'closed'
                          ? '#374151'
                          : '#6B7280',
                    }}
                  >
                    {item.status}
                  </Text>

                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleEdit(item.id)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: '#BFDBFE',
                        marginRight: 6,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#2563EB' }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item.id)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: '#FCA5A5',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#DC2626' }}>Hapus</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => loadHistory(item.id)}
                    style={{
                      marginTop: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: '#4B5563' }}>
                      {expandedHistory[item.id] ? 'Tutup histori' : 'Histori'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {expandedHistory[item.id] && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                    marginTop: 10,
                    paddingTop: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151' }}>
                    Histori Pembayaran:
                  </Text>
                  {paymentHistory[item.id] && paymentHistory[item.id].length > 0 ? (
                    paymentHistory[item.id].map((p) => (
                      <View
                        key={p.id}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginTop: 4,
                          backgroundColor: '#F9FAFB',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>
                          {formatDateId(p.date)}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#111827' }}>
                          {formatRupiah(p.amount)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                      Belum ada pembayaran tercatat.
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal form */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 16,
              maxHeight: '90%',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                {editingId ? 'Edit Cicilan' : 'Tambah Cicilan'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <Text style={{ fontSize: 18, color: '#9CA3AF' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  Nama Cicilan
                </Text>
                <TextInput
                  value={form.name}
                  onChangeText={(t) => handleChange('name', t)}
                  placeholder="Kredit HP, KPR, dsb"
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                  }}
                />
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  Total Pokok (Rp)
                </Text>
                <TextInput
                  value={form.principal}
                  onChangeText={(t) => handleChange('principal', t)}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                  }}
                />
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  Bunga per Tahun (%)
                </Text>
                <TextInput
                  value={form.interest_rate}
                  onChangeText={(t) => handleChange('interest_rate', t)}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                  }}
                />
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  Bayar per Bulan (Rp)
                </Text>
                <TextInput
                  value={form.monthly_payment}
                  onChangeText={(t) => handleChange('monthly_payment', t)}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                  }}
                />
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  Sisa Bulan Cicilan
                </Text>
                <TextInput
                  value={form.total_months}
                  onChangeText={(t) => handleChange('total_months', t)}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                  }}
                />
              </View>

              {/* Mulai Cicilan pakai DateTimePicker */}
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  Mulai Cicilan
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    paddingHorizontal: 10,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#111827' }}>
                    {form.start_date || 'Pilih tanggal mulai'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280' }}>Pilih</Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={startDateObj}
                    mode="date"
                    display="calendar"
                    onChange={handleChangeStartDate}
                  />
                )}
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  Tanggal Jatuh Tempo (1–31)
                </Text>
                <TextInput
                  value={form.due_day}
                  onChangeText={(t) => handleChange('due_day', t)}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                  }}
                />
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  Status
                </Text>
                <View style={{ flexDirection: 'row' }}>
                  {['active', 'closed'].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => handleChange('status', s as 'active' | 'closed')}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: form.status === s ? '#7C3AED' : '#D1D5DB',
                        marginRight: 8,
                        backgroundColor: form.status === s ? '#EDE9FE' : 'white',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: form.status === s ? '#4C1D95' : '#4B5563',
                        }}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  Deskripsi / Catatan
                </Text>
                <TextInput
                  value={form.notes}
                  onChangeText={(t) => handleChange('notes', t)}
                  placeholder="opsional, misal: kredit motor 24x, tenor 2 tahun"
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                  }}
                />
              </View>
            </ScrollView>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: 8,
              }}
            >
              <TouchableOpacity
                onPress={resetForm}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  marginRight: 8,
                }}
              >
                <Text style={{ fontSize: 13, color: '#4B5563' }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: '#7C3AED',
                }}
              >
                <Text style={{ fontSize: 13, color: 'white', fontWeight: '600' }}>
                  Simpan
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
