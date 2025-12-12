// app/(tabs)/expense.tsx
import { Ionicons } from '@expo/vector-icons';
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

type ExpenseItem = {
  id: number;
  category: string;
  amount: number;
  date: string;
  isoDate?: string;
  installment_id?: number | null;
};

type OverviewBar = {
  date: string;
  amount: string | number;
};

type ExpenseOverview = {
  totalExpense: number;
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

export default function ExpenseScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [overview, setOverview] = useState<ExpenseOverview | null>(null);
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

  const MAX_PREVIEW = 5;
  const [seeAll, setSeeAll] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // ---------- API helpers ----------

  const getTokenOrRedirect = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/');
      throw new Error('No token');
    }
    return token;
  };

  const loadSummary = async () => {
    try {
      const token = await getTokenOrRedirect();
      const qs = `start=${dateRange.start}&end=${dateRange.end}`;

      const res = await api.get(`/api/expense/summary?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawItems = Array.isArray(res.data.recent)
        ? res.data.recent
        : Array.isArray(res.data.recentRows)
        ? res.data.recentRows
        : [];

      const list: ExpenseItem[] = rawItems.map((row: any, index: number) => ({
        id: row.id ?? index,
        category: row.category ?? 'Tanpa Kategori',
        amount: Number(row.amount ?? 0),
        date: row.date ?? row.isoDate ?? '',
        isoDate: row.isoDate,
        installment_id: row.installment_id ?? null,
      }));
      setItems(list);

      const rawDonut = Array.isArray(res.data.donutChart)
        ? res.data.donutChart
        : Array.isArray(res.data.barChart)
        ? res.data.barChart
        : [];
      setDonut(rawDonut);
    } catch (err: any) {
      if (err.message === 'No token') return;
      console.log('expense summary error:', err.response?.data || err.message);
      Alert.alert('Error', 'Gagal mengambil data expense');
    }
  };

  const loadOverview = async (range: DateRange) => {
    try {
      const token = await getTokenOrRedirect();
      const qs = `start=${range.start}&end=${range.end}`;

      const res = await api.get(`/api/expense/overview?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const bars: OverviewBar[] = Array.isArray(res.data.barChart)
        ? res.data.barChart
        : [];

      const total = bars.reduce(
        (sum, b) => sum + Number(b.amount ?? 0),
        0
      );

      setOverview({ totalExpense: total, barChart: bars });
    } catch (err: any) {
      if (err.message === 'No token') return;
      console.log('expense overview error:', err.response?.data || err.message);
    }
  };

  const reloadAll = async () => {
    await Promise.all([loadSummary(), loadOverview(dateRange)]);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadSummary(), loadOverview(dateRange)]);
      setLoading(false);
    };
    load();
  }, [dateRange.start, dateRange.end]);

  // ---------- UI helpers ----------

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

  const handleDelete = async (item: ExpenseItem) => {
    Alert.alert(
      'Konfirmasi',
      'Yakin ingin menghapus expense ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getTokenOrRedirect();
              await api.delete(`/api/expense/${item.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              await reloadAll();
            } catch (err: any) {
              if (err.message === 'No token') return;
              console.log(
                'delete expense error:',
                err.response?.data || err.message
              );
              Alert.alert('Error', 'Gagal menghapus expense');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const maxAmount =
    overview && overview.barChart.length > 0
      ? Math.max(...overview.barChart.map((b) => Number(b.amount ?? 0)))
      : 0;

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FEF2F2' }}>
      <ScrollView
        style={{ flex: 1 }}
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
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#991B1B' }}>
            Expense Overview
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/expense-add')}
            style={{
              backgroundColor: '#EF4444',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFF" />
            <Text
              style={{
                color: 'white',
                fontWeight: '600',
                marginLeft: 4,
              }}
            >
              Tambah
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter tanggal From / To */}
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

        {/* Preset tanggal */}
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => handlePreset(7, '7d')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: preset === '7d' ? '#DC2626' : '#D1D5DB',
              marginRight: 8,
              backgroundColor: preset === '7d' ? '#FEE2E2' : 'white',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: preset === '7d' ? '#B91C1C' : '#4B5563',
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
              borderColor: preset === '30d' ? '#DC2626' : '#D1D5DB',
              backgroundColor: preset === '30d' ? '#FEE2E2' : 'white',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: preset === '30d' ? '#B91C1C' : '#4B5563',
              }}
            >
              Last 30 days
            </Text>
          </TouchableOpacity>
        </View>

        {/* Total Expense */}
        {overview && (
          <View
            style={{
              backgroundColor: '#FEE2E2',
              padding: 14,
              borderRadius: 14,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 12, color: '#7F1D1D', marginBottom: 4 }}>
              Total Expense
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: '#B91C1C',
              }}
            >
              Rp {overview.totalExpense.toLocaleString('id-ID')}
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
              Expense Trend
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
                        backgroundColor: '#EF4444',
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

        {/* Recent Expense + See all */}
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
          Recent Expense
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
              borderColor: '#DC2626',
            }}
          >
            <Text
              style={{ fontSize: 12, color: '#DC2626', fontWeight: '500' }}
            >
              {seeAll ? 'Show Less' : 'See All'}
            </Text>
          </TouchableOpacity>
        )}

        {items.length === 0 ? (
          <Text style={{ color: '#6B7280', marginBottom: 16 }}>
            Belum ada expense.
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
                  <Text style={{ fontWeight: '700', color: '#DC2626' }}>
                    -Rp {Number(item.amount).toLocaleString('id-ID')}
                  </Text>
                  <View style={{ flexDirection: 'row', marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/expense-add',
                          params: { id: String(item.id) },
                        })
                      }
                      style={{ marginRight: 12 }}
                    >
                      <Text style={{ fontSize: 12, color: '#4B5563' }}>
                        Edit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)}>
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
              backgroundColor: '#FEE2E2',
              padding: 10,
              borderRadius: 10,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontWeight: '600', marginBottom: 2 }}>
              Total Expense
            </Text>
            <Text style={{ fontSize: 12, color: '#4B5563' }}>
              Anda telah mengeluarkan Rp{' '}
              {totalFromDonut.toLocaleString('id-ID')} selama 30 hari.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: '#FEF3C7',
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
              backgroundColor: '#DBEAFE',
              padding: 10,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontWeight: '600', marginBottom: 2 }}>
              Top Category
            </Text>
            <Text style={{ fontSize: 12, color: '#4B5563' }}>
              {topCategory
                ? `${topCategory.category} menjadi pengeluaran utama dengan Rp ${Number(
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
            <Text style={{ color: '#6B7280' }}>
              Belum ada kategori expense.
            </Text>
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
                    <Text style={{ fontWeight: '600', color: '#B91C1C' }}>
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
                        backgroundColor: '#EF4444',
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
    </View>
  );
}
