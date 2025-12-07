import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import React, { useEffect, useRef, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../api/client';

type LatestTx = {
    id?: number;
    type: 'income' | 'expense' | 'installment';
    category: string;
    amount: number;
    date: string;
};

type DashboardSummary = {
    totalBalance?: number;
    totalIncome: number;
    totalExpense: number;
    latest?: LatestTx[];
    installmentSummary?: {
        totalThisMonth: number;
        remainingBalance: number;
        status: 'OK' | 'WARNING';
    };
    userName?: string;
};

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [openMenu, setOpenMenu] = useState(false);
    const [userName, setUserName] = useState<string>('User');

    // animasi sidebar
    const slideX = useRef(new Animated.Value(-300)).current;

    const openDrawer = () => {
        setOpenMenu(true);
        Animated.timing(slideX, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    };

    const closeDrawer = () => {
        Animated.timing(slideX, {
            toValue: -300,
            duration: 250,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
        }).start(() => setOpenMenu(false));
    };

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (!token) {
                    router.replace('/');
                    return;
                }

                const res = await api.get('/api/dashboard', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                console.log('dashboard data:', JSON.stringify(res.data, null, 2));
                setSummary(res.data);

                if (res.data.userName) {
                    setUserName(res.data.userName);
                } else {
                    const storedName = await AsyncStorage.getItem('userName');
                    if (storedName) setUserName(storedName);
                }
            } catch (err: any) {
                console.log('dashboard error:', err.response?.data || err.message);
                Alert.alert('Error', 'Gagal mengambil data dashboard');
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);

    const handleNavigate = (path: any) => {
        closeDrawer();
        router.replace(path);
    };

    const handleLogout = async () => {
        closeDrawer();
        await AsyncStorage.removeItem('token');
        // await AsyncStorage.removeItem('userName');
        router.replace('/');
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator />
            </View>
        );
    }

    if (!summary) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Tidak ada data</Text>
            </View>
        );
    }

    const totalBalance =
        typeof summary.totalBalance === 'number'
            ? summary.totalBalance
            : (summary.totalIncome || 0) - (summary.totalExpense || 0);

    const initial = userName.trim().charAt(0).toUpperCase() || 'U';

    return (
        <View style={{ flex: 1, backgroundColor: '#F3F4FF' }}>
            {/* Header */}
            <View
                style={{
                    paddingTop: 40,
                    paddingHorizontal: 20,
                    paddingBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                }}
            >
                <TouchableOpacity
                    onPress={openDrawer}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 999,
                        backgroundColor: '#4F46E5',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                    }}
                >
                    <Ionicons name="person-outline" size={22} color="#FFF" />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontSize: 28,
                            fontWeight: '800',
                            marginBottom: 4,
                            paddingTop: 25,
                        }}
                    >
                        Dashboard
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>
                        Selamat datang kembali,{' '}
                        <Text style={{ color: '#7C3AED', fontWeight: '600' }}>
                            {userName}
                        </Text>
                        ! Berikut ringkasan keuangan Anda.
                    </Text>
                </View>
            </View>

            {/* Konten utama */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            >
                {/* Summary Cards */}
                <View
                    style={{
                        flexDirection: 'row',
                        gap: 14,
                        marginBottom: 20,
                    }}
                >
                    {[
                        {
                            title: 'Total Saldo',
                            value: totalBalance,
                            bg: '#EDE9FE',
                            color: '#6D28D9',
                        },
                        {
                            title: 'Total Pemasukan',
                            value: summary.totalIncome,
                            bg: '#DCFCE7',
                            color: '#166534',
                        },
                        {
                            title: 'Total Pengeluaran',
                            value: summary.totalExpense,
                            bg: '#FEE2E2',
                            color: '#B91C1C',
                        },
                    ].map((item, index) => (
                        <View
                            key={index}
                            style={{
                                flex: 1,
                                backgroundColor: item.bg,
                                padding: 14,
                                borderRadius: 14,
                                shadowColor: '#000',
                                shadowOpacity: 0.08,
                                shadowRadius: 4,
                                elevation: 3,
                            }}
                        >
                            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                                {item.title}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: '700',
                                    color: item.color,
                                }}
                            >
                                Rp {item.value?.toLocaleString('id-ID')}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Ringkasan Cicilan */}
                <View
                    style={{
                        backgroundColor: '#FFFFFF',
                        padding: 16,
                        borderRadius: 14,
                        marginBottom: 20,
                        shadowColor: '#000',
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        elevation: 3,
                    }}
                >
                    <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
                        Ringkasan Cicilan
                    </Text>

                    <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                        Cicilan bulan ini
                    </Text>

                    <Text style={{ marginBottom: 2 }}>
                        Total cicilan: Rp{' '}
                        {(summary.installmentSummary?.totalThisMonth ?? 0).toLocaleString(
                            'id-ID'
                        )}
                    </Text>
                    <Text>
                        Sisa saldo: Rp{' '}
                        {(summary.installmentSummary?.remainingBalance ?? 0).toLocaleString(
                            'id-ID'
                        )}
                    </Text>

                    <View
                        style={{
                            marginTop: 12,
                            padding: 10,
                            borderRadius: 10,
                            backgroundColor:
                                summary.installmentSummary?.status === 'OK'
                                    ? '#DCFCE7'
                                    : '#FEE2E2',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 12,
                                color:
                                    summary.installmentSummary?.status === 'OK'
                                        ? '#166534'
                                        : '#B91C1C',
                                fontWeight: '600',
                            }}
                        >
                            {summary.installmentSummary?.status === 'OK'
                                ? 'Saldo cukup untuk membayar semua cicilan bulan ini.'
                                : 'Saldo belum cukup untuk membayar semua cicilan bulan ini.'}
                        </Text>
                    </View>
                </View>

                {/* Aktivitas Terkini */}
                <View
                    style={{
                        backgroundColor: 'white',
                        padding: 16,
                        borderRadius: 14,
                        shadowColor: '#000',
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        elevation: 3,
                        marginBottom: 24,
                    }}
                >
                    <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
                        Aktivitas Terkini
                    </Text>

                    {Array.isArray(summary.latest) && summary.latest.length > 0 ? (
                        summary.latest.map((tx: any, index: number) => (
                            <View
                                key={tx.id ?? index}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    marginBottom: 14,
                                }}
                            >
                                <View>
                                    <Text style={{ fontWeight: '600', marginBottom: 2 }}>
                                        {tx.category}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#6B7280' }}>
                                        {tx.date}
                                    </Text>
                                </View>

                                <Text
                                    style={{
                                        fontWeight: '700',
                                        color: tx.type === 'income' ? '#16A34A' : '#DC2626',
                                    }}
                                >
                                    {tx.type === 'income' ? '+Rp ' : '-Rp '}
                                    {tx.amount?.toLocaleString('id-ID')}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <Text style={{ color: '#6B7280' }}>Belum ada transaksi.</Text>
                    )}
                </View>
            </ScrollView>

            {/* Sidebar slide dari kiri */}
            {openMenu && (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                        flexDirection: 'row',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                    }}
                >
                    <Animated.View
                        style={{
                            width: '70%',
                            backgroundColor: '#FFFFFF',
                            paddingTop: 50,
                            paddingHorizontal: 16,
                            transform: [{ translateX: slideX }],
                        }}
                    >
                        {/* Avatar + nama */}
                        <View
                            style={{
                                alignItems: 'center',
                                marginBottom: 32,
                            }}
                        >
                            <View
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 999,
                                    backgroundColor: '#EDE9FE',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 32,
                                        fontWeight: '700',
                                        color: '#7C3AED',
                                    }}
                                >
                                    {initial}
                                </Text>
                            </View>
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: '600',
                                    color: '#111827',
                                }}
                            >
                                {userName}
                            </Text>
                        </View>

                        {[
                            { label: 'Dashboard', path: '/(tabs)/dashboard', icon: 'grid-outline' },
                            { label: 'Income', path: '/(tabs)/income', icon: 'wallet-outline' },
                            { label: 'Expense', path: '/(tabs)/expense', icon: 'receipt-outline' },
                            {
                                label: 'Recommendation',
                                path: '/recommended',
                                icon: 'sparkles-outline',
                            },
                            { label: 'Cicilan', path: '/(tabs)/installment', icon: 'layers-outline' },
                        ].map((item) => (
                            <TouchableOpacity
                                key={item.label}
                                onPress={() => handleNavigate(item.path)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 10,
                                }}
                            >
                                <Ionicons
                                    name={item.icon as any}
                                    size={20}
                                    color="#4B5563"
                                    style={{ marginRight: 12 }}
                                />
                                <Text style={{ fontSize: 15, color: '#111827' }}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        <View
                            style={{
                                height: 1,
                                backgroundColor: '#E5E7EB',
                                marginVertical: 16,
                            }}
                        />

                        <TouchableOpacity
                            onPress={handleLogout}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 10,
                                backgroundColor: '#FEE2E2',
                                borderRadius: 10,
                                paddingHorizontal: 10,
                            }}
                        >
                            <Ionicons
                                name="log-out-outline"
                                size={20}
                                color="#DC2626"
                                style={{ marginRight: 10 }}
                            />
                            <Text
                                style={{
                                    fontSize: 15,
                                    color: '#DC2626',
                                    fontWeight: '600',
                                }}
                            >
                                Logout
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
                </View>
            )}
        </View>
    );
}
