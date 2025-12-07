import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
      }}
    >
      <Tabs.Screen
        name="dashboard"            // harus sama persis dengan nama file dashboard.tsx
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="income"               // income.tsx
        options={{
          title: 'Income',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="expense"              // expense.tsx
        options={{
          title: 'Expense',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="installment"          // installment.tsx
        options={{
          title: 'Cicilan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="albums-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
