import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, {
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../api/client';

type IncomeItem = {
    id: number;
    category: string;
    amount: number;
    date: string;
};

type OverviewBar = {
    date: string;
    amount: string | number;
};

type IncomeOverview = {
    totalIncome: number;
    barChart: OverviewBar[];
};

type DonutItem = {
    category: string;
    amount: string | number;
};

type DateRange = {
    start: string;
    end: string;
};

export default function IncomeScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<IncomeItem[]>([]);
    const [overview, setOverview] = useState<IncomeOverview | null>(null);
    const [donut, setDonut] = useState<DonutItem[]>([]);
    const [dateRange, setDateRange] = useState<DateRange>(() => {
        const today = new Date();
        const end = today.toISOString().slice(0, 10);
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 29);
        const start = startDate.toISOString().slice(0, 10);
        return { start, end };
    });
    const [preset, setPreset] = useState<'7d' | '30d' | null>('30d');

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // see all / show less
    const [seeAll, setSeeAll] = useState(false);
    const MAX_PREVIEW = 5;

    const loadAllIncome = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                router.replace('/');
                return;
            }

            const res = await api.get('/api/income/all', {
                headers: { Authorization: `Bearer ${token}` },
            });

            const rawItems = Array.isArray(res.data.items)
                ? res.data.items
                : Array.isArray(res.data)
                    ? res.data
                    : [];

            const list: IncomeItem[] = rawItems.map((row: any, index: number) => ({
                id: row.id ?? index,
                category: row.category ?? 'Tanpa Kategori',
                amount: Number(row.amount ?? 0),
                date: row.date ?? row.isoDate ?? '',
            }));

            setItems(list);
        } catch (err: any) {
            console.log('income all error:', err.response?.data || err.message);
            Alert.alert('Error', 'Gagal mengambil data income');
        }
    };

    const loadSummary = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                router.replace('/');
                return;
            }

            const res = await api.get('/api/income/summary', {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log('income summary:', JSON.stringify(res.data, null, 2));

            const rawDonut = Array.isArray(res.data.donutChart)
                ? res.data.donutChart
                : [];

            setDonut(rawDonut);
        } catch (err: any) {
            console.log('income summary error:', err.response?.data || err.message);
        }
    };

    const loadOverview = async (range: DateRange) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                router.replace('/');
                return;
            }

            const qs = `start=${range.start}&end=${range.end}`;

            const res = await api.get(`/api/income/overview?${qs}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log('income overview:', JSON.stringify(res.data, null, 2));

            const bars: OverviewBar[] = Array.isArray(res.data.barChart)
                ? res.data.barChart
                : [];

            const total = bars.reduce(
                (sum, b) => sum + Number(b.amount ?? 0),
                0
            );

            setOverview({ totalIncome: total, barChart: bars });
        } catch (err: any) {
            console.log('income overview error:', err.response?.data || err.message);
        }
    };

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            await Promise.all([
                loadAllIncome(),
                loadSummary(),
                loadOverview(dateRange),
            ]);
            setLoading(false);
        };
        loadAll();
    }, [dateRange.start, dateRange.end]);

    const reloadAll = async () => {
        await Promise.all([
            loadAllIncome(),
            loadSummary(),
            loadOverview(dateRange),
        ]);
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator />
            </View>
        );
    }

    const totalFromDonut = donut.reduce(
        (sum, d) => sum + Number(d.amount ?? 0),
        0
    );
    const insightDays = 30;
    const avgPerDay = insightDays > 0 ? totalFromDonut / insightDays : 0;
    const topCategory =
        donut.length > 0
            ? [...donut].sort(
                (a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0)
            )[0]
            : null;

    const maxAmount =
        overview && overview.barChart.length > 0
            ? Math.max(...overview.barChart.map((b) => Number(b.amount ?? 0)))
            : 0;

    const handlePreset = (daysBack: number, code: '7d' | '30d') => {
        const today = new Date();
        const end = today.toISOString().slice(0, 10);
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - (daysBack - 1));
        const start = startDate.toISOString().slice(0, 10);
        setDateRange({ start, end });
        setPreset(code);
    };

    const onChangeStart = (event: DateTimePickerEvent, selected?: Date) => {
        if (event.type === 'set' && selected) {
            const iso = selected.toISOString().slice(0, 10);
            setDateRange((prev) => ({ ...prev, start: iso }));
        }
        if (Platform.OS !== 'ios') setShowStartPicker(false);
    };

    const onChangeEnd = (event: DateTimePickerEvent, selected?: Date) => {
        if (event.type === 'set' && selected) {
            const iso = selected.toISOString().slice(0, 10);
            setDateRange((prev) => ({ ...prev, end: iso }));
        }
        if (Platform.OS !== 'ios') setShowEndPicker(false);
    };

    const handleDeleteIncome = async (id: number) => {
        Alert.alert(
            'Konfirmasi',
            'Yakin ingin menghapus income ini?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('token');
                            if (!token) {
                                router.replace('/');
                                return;
                            }
                            await api.delete(`/api/income/${id}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            await reloadAll();
                        } catch (err: any) {
                            console.log(
                                'delete income error:',
                                err.response?.data || err.message
                            );
                            Alert.alert('Error', 'Gagal menghapus income');
                        }
                    },
                },
            ]
        );
    };

    const handleEditIncome = (item: IncomeItem) => {
        router.push({
            pathname: '/income-add',
            params: { id: String(item.id) },
        });
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: '#F3F4FF' }}
            contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 32,
                paddingTop: 50,
            }}
        >
            {/* Header + tambah */}
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginBottom: 20,
                }}
            >
                <Text style={{ fontSize: 24, fontWeight: '700' }}>
                    Income Overview
                </Text>
                <TouchableOpacity
                    onPress={() => router.push('/income-add')}
                    style={{
                        backgroundColor: '#4F46E5',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 999,
                    }}
                >
                    <Text style={{ color: 'white', fontWeight: '600' }}>+ Tambah</Text>
                </TouchableOpacity>
            </View>

            {/* Filter tanggal */}
            <View
                style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    marginBottom: 16,
                }}
            >
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 4 }}>
                        From
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowStartPicker(true)}
                        style={{
                            borderWidth: 1,
                            borderColor: '#D1D5DB',
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            backgroundColor: 'white',
                        }}
                    >
                        <Text>{dateRange.start}</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 4 }}>
                        To
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowEndPicker(true)}
                        style={{
                            borderWidth: 1,
                            borderColor: '#D1D5DB',
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            backgroundColor: 'white',
                        }}
                    >
                        <Text>{dateRange.end}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {showStartPicker && (
                <DateTimePicker
                    value={new Date(dateRange.start)}
                    mode="date"
                    display="calendar"
                    onChange={onChangeStart}
                />
            )}

            {showEndPicker && (
                <DateTimePicker
                    value={new Date(dateRange.end)}
                    mode="date"
                    display="calendar"
                    onChange={onChangeEnd}
                />
            )}

            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <TouchableOpacity
                    onPress={() => handlePreset(7, '7d')}
                    style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: preset === '7d' ? '#6366F1' : '#D1D5DB',
                        marginRight: 8,
                        backgroundColor: preset === '7d' ? '#EEF2FF' : 'white',
                    }}
                >
                    <Text
                        style={{
                            fontSize: 12,
                            color: preset === '7d' ? '#4F46E5' : '#4B5563',
                        }}
                    >
                        Last 7 days
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handlePreset(30, '30d')}
                    style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: preset === '30d' ? '#6366F1' : '#D1D5DB',
                        backgroundColor: preset === '30d' ? '#EEF2FF' : 'white',
                    }}
                >
                    <Text
                        style={{
                            fontSize: 12,
                            color: preset === '30d' ? '#4F46E5' : '#4B5563',
                        }}
                    >
                        Last 30 days
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Total Income */}
            {overview && (
                <View
                    style={{
                        backgroundColor: '#EDE9FE',
                        padding: 14,
                        borderRadius: 14,
                        marginBottom: 20,
                    }}
                >
                    <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                        Total Income
                    </Text>
                    <Text
                        style={{
                            fontSize: 22,
                            fontWeight: '700',
                            color: '#6D28D9',
                        }}
                    >
                        Rp {overview.totalIncome.toLocaleString('id-ID')}
                    </Text>
                </View>
            )}

            {/* Trend */}
            {overview && overview.barChart.length > 0 && (
                <View
                    style={{
                        backgroundColor: 'white',
                        padding: 14,
                        borderRadius: 14,
                        marginBottom: 20,
                    }}
                >
                    <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
                        Income Trend
                    </Text>
                    <View
                        style={{
                            height: 180,
                            flexDirection: 'row',
                            alignItems: 'flex-end',
                        }}
                    >
                        {overview.barChart.map((b, idx) => {
                            const amount = Number(b.amount ?? 0);
                            const h = maxAmount > 0 ? (amount / maxAmount) * 150 : 0;
                            return (
                                <View
                                    key={idx}
                                    style={{
                                        flex: 1,
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        marginHorizontal: 4,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 18,
                                            height: h,
                                            borderRadius: 6,
                                            backgroundColor: '#8B5CF6',
                                        }}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 9,
                                            color: '#6B7280',
                                            marginTop: 4,
                                            textAlign: 'center',
                                        }}
                                        numberOfLines={1}
                                    >
                                        {b.date}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* Recent Income + See All / Show Less */}
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
                Recent Income
            </Text>

            {items.length > 0 && (
                <TouchableOpacity
                    onPress={() => setSeeAll(!seeAll)}
                    style={{
                        alignSelf: 'flex-end',
                        marginBottom: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: '#4F46E5',
                    }}
                >
                    <Text
                        style={{ fontSize: 12, color: '#4F46E5', fontWeight: '500' }}
                    >
                        {seeAll ? 'Show Less' : 'See All'}
                    </Text>
                </TouchableOpacity>
            )}

            {items.length === 0 ? (
                <Text style={{ color: '#6B7280', marginBottom: 16 }}>
                    Belum ada data income.
                </Text>
            ) : (
                <View style={{ marginBottom: 16 }}>
                    {(seeAll ? items : items.slice(0, MAX_PREVIEW)).map((item) => (
                        <View
                            key={item.id}
                            style={{
                                backgroundColor: 'white',
                                padding: 12,
                                borderRadius: 10,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8,
                            }}
                        >
                            <View>
                                <Text style={{ fontWeight: '600' }}>{item.category}</Text>
                                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                                    {item.date}
                                </Text>
                            </View>

                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontWeight: '700', color: '#16A34A' }}>
                                    +Rp {item.amount.toLocaleString('id-ID')}
                                </Text>
                                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                                    <TouchableOpacity
                                        onPress={() => handleEditIncome(item)}
                                        style={{ marginRight: 12 }}
                                    >
                                        <Text style={{ fontSize: 12, color: '#4F46E5' }}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteIncome(item.id)}
                                    >
                                        <Text style={{ fontSize: 12, color: '#DC2626' }}>
                                            Hapus
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Insights */}
            <View
                style={{
                    marginTop: 8,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: '#F9FAFB',
                }}
            >
                <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
                    Insights
                </Text>

                <View
                    style={{
                        backgroundColor: '#F5F3FF',
                        padding: 10,
                        borderRadius: 10,
                        marginBottom: 8,
                    }}
                >
                    <Text style={{ fontWeight: '600', marginBottom: 2 }}>
                        Total Income
                    </Text>
                    <Text style={{ fontSize: 12, color: '#4B5563' }}>
                        Anda telah mengumpulkan Rp{' '}
                        {totalFromDonut.toLocaleString('id-ID')} selama 30 hari.
                    </Text>
                </View>

                <View
                    style={{
                        backgroundColor: '#EFF6FF',
                        padding: 10,
                        borderRadius: 10,
                        marginBottom: 8,
                    }}
                >
                    <Text style={{ fontWeight: '600', marginBottom: 2 }}>
                        Rata-rata per Hari
                    </Text>
                    <Text style={{ fontSize: 12, color: '#4B5563' }}>
                        Rp {Math.round(avgPerDay).toLocaleString('id-ID')}/hari.
                    </Text>
                </View>

                <View
                    style={{
                        backgroundColor: '#FFFBEB',
                        padding: 10,
                        borderRadius: 10,
                    }}
                >
                    <Text style={{ fontWeight: '600', marginBottom: 2 }}>
                        Top Category
                    </Text>
                    <Text style={{ fontSize: 12, color: '#4B5563' }}>
                        {topCategory
                            ? `${topCategory.category} menjadi sumber utama dengan Rp ${Number(
                                topCategory.amount ?? 0
                            ).toLocaleString('id-ID')}.`
                            : 'Belum ada kategori.'}
                    </Text>
                </View>
            </View>

            {/* Categories */}
            <View
                style={{
                    marginTop: 24,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: '#FFFFFF',
                }}
            >
                <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
                    Categories
                </Text>

                {donut.length === 0 ? (
                    <Text style={{ color: '#6B7280' }}>Belum ada kategori income.</Text>
                ) : (
                    donut.map((cat, index) => {
                        const total = totalFromDonut || 1;
                        const percent = (Number(cat.amount ?? 0) / total) * 100;

                        return (
                            <View key={index} style={{ marginBottom: 10 }}>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        marginBottom: 2,
                                    }}
                                >
                                    <Text style={{ fontWeight: '500' }}>{cat.category}</Text>
                                    <Text style={{ fontWeight: '600', color: '#7C3AED' }}>
                                        Rp {Number(cat.amount ?? 0).toLocaleString('id-ID')}
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        height: 6,
                                        borderRadius: 999,
                                        backgroundColor: '#E5E7EB',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <View
                                        style={{
                                            height: 6,
                                            width: `${percent}%`,
                                            backgroundColor: '#8B5CF6',
                                        }}
                                    />
                                </View>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        color: '#6B7280',
                                        marginTop: 2,
                                    }}
                                >
                                    {percent.toFixed(1)}%
                                </Text>
                            </View>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}
