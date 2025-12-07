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

export default function IncomeAddScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams(); // kalau ada id -> mode edit

    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState<string>(
        new Date().toISOString().slice(0, 10)
    );
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const isEdit = !!id;

    // kalau edit, load detail income sekali
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
                const res = await api.get(`/api/income/all`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const all = Array.isArray(res.data.items) ? res.data.items : res.data;
                const found = all.find((it: any) => String(it.id) === String(id));
                if (found) {
                    setCategory(found.category ?? '');
                    setAmount(String(Number(found.amount ?? 0)));
                    const d = found.isoDate || found.date;
                    if (d) {
                        const dt = new Date(d);
                        const yyyy = dt.getFullYear();
                        const mm = String(dt.getMonth() + 1).padStart(2, '0');
                        const dd = String(dt.getDate()).padStart(2, '0');
                        setDate(`${yyyy}-${mm}-${dd}`);
                    }
                }
            } catch (err: any) {
                console.log('load income detail error:', err.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        };
        loadDetail();
    }, [id]);

    const handleChangeDate = (event: DateTimePickerEvent, selected?: Date) => {
        if (event.type === 'set' && selected) {
            const iso = selected.toISOString().slice(0, 10);
            setDate(iso);
        }
        if (Platform.OS !== 'ios') setShowDatePicker(false);
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
            };

            if (isEdit) {
                await api.put(`/api/income/${id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } else {
                await api.post('/api/income', payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            Alert.alert('Sukses', `Income berhasil di${isEdit ? 'update' : 'tambahkan'}`, [
                {
                    text: 'OK',
                    onPress: () => router.replace('/income'),
                },
            ]);
        } catch (err: any) {
            console.log('save income error:', err.response?.data || err.message);
            Alert.alert('Error', `Gagal menyimpan income`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#F3F4FF' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 40, paddingBottom: 24 }}
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
                        onPress={() => router.replace('/income')}
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
                    <Text style={{ fontSize: 22, fontWeight: '700' }}>
                        {isEdit ? 'Edit Income' : 'Tambah Income'}
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
                    {/* Category */}
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
                        placeholder="Misal: Gaji, Project"
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

                    {/* Amount */}
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
                        placeholder="Misal: 1500000"
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

                    {/* Date */}
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

                    {/* Button */}
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={loading}
                        style={{
                            backgroundColor: '#4F46E5',
                            paddingVertical: 12,
                            borderRadius: 10,
                            alignItems: 'center',
                            opacity: loading ? 0.8 : 1,
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>
                                {isEdit ? 'Update Income' : 'Simpan'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
