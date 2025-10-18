import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';

// Simple Redux slice
const borrowingSlice = createSlice({
  name: 'borrowing',
  initialState: {
    items: [],
    count: 0
  },
  reducers: {
    addItem: (state, action) => {
      state.items.push({
        id: Date.now(),
        name: action.payload.name,
        description: action.payload.description,
        dueDate: action.payload.dueDate,
        date: new Date().toLocaleDateString()
      });
      state.count += 1;
    },
    clearItems: (state) => {
      state.items = [];
      state.count = 0;
    }
  }
});

const { addItem, clearItems } = borrowingSlice.actions;

// Redux store
const store = configureStore({
  reducer: {
    borrowing: borrowingSlice.reducer
  }
});

// Dashboard Component
function Dashboard({ onNavigateToAddItem }) {
  const { items, count } = useSelector(state => state.borrowing);
  
  // Calculate stats
  const today = new Date();
  const overdueItems = items.filter(item => new Date(item.dueDate) < today);
  const dueSoonItems = items.filter(item => {
    const dueDate = new Date(item.dueDate);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Dashboard</Text>
      <Text style={styles.subtitle}>Borrowing Tracker Overview</Text>
      
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.statCardBlue]}>
          <Text style={styles.statNumber}>{count}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        
        <View style={[styles.statCard, styles.statCardRed]}>
          <Text style={styles.statNumber}>{overdueItems.length}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
        
        <View style={[styles.statCard, styles.statCardOrange]}>
          <Text style={styles.statNumber}>{dueSoonItems.length}</Text>
          <Text style={styles.statLabel}>Due Soon</Text>
        </View>
      </View>

      {/* Add Item Button */}
      <TouchableOpacity 
        style={styles.addItemButton} 
        onPress={onNavigateToAddItem}
      >
        <Text style={styles.addItemButtonText}>➕ Add New Item</Text>
      </TouchableOpacity>

      {/* Overdue Items Alert */}
      {overdueItems.length > 0 && (
        <View style={styles.alertSection}>
          <Text style={styles.alertTitle}>⚠️ Overdue Items - Action Required!</Text>
          {overdueItems.map((item) => (
            <View key={item.id} style={styles.alertCard}>
              <Text style={styles.alertItemName}>{item.name}</Text>
              <Text style={styles.alertItemDate}>Due: {item.dueDate}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Due Soon Items */}
      {dueSoonItems.length > 0 && (
        <View style={styles.warnSection}>
          <Text style={styles.warnTitle}>🔔 Due Soon (Next 3 Days)</Text>
          {dueSoonItems.map((item) => (
            <View key={item.id} style={styles.warnCard}>
              <Text style={styles.warnItemName}>{item.name}</Text>
              <Text style={styles.warnItemDate}>Due: {item.dueDate}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Items */}
      {items.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>📝 Recent Items</Text>
          {items.slice(-5).reverse().map((item) => {
            const isOverdue = new Date(item.dueDate) < today;
            return (
              <View 
                key={item.id} 
                style={[
                  styles.recentCard,
                  isOverdue && styles.recentCardOverdue
                ]}
              >
                <Text style={styles.recentItemName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.recentItemDescription}>{item.description}</Text>
                )}
                <Text style={styles.recentItemDate}>
                  Due: {item.dueDate} {isOverdue && '⚠️'}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No items yet. Add your first item to get started!</Text>
        </View>
      )}
    </ScrollView>
  );
}

// Add Item Component (formerly BorrowingApp)
function AddItemPage({ onNavigateBack }) {
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const dispatch = useDispatch();
  const { items, count } = useSelector(state => state.borrowing);

  const handleAddItem = () => {
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }
    
    if (!dueDate.trim()) {
      Alert.alert('Error', 'Please enter a due date');
      return;
    }
    
    dispatch(addItem({
      name: itemName,
      description: itemDescription,
      dueDate: dueDate
    }));
    
    setItemName('');
    setItemDescription('');
    setDueDate('');
    setSelectedDate(new Date());
    Alert.alert('Success', 'Item added! Returning to dashboard...', [
      { text: 'OK', onPress: onNavigateBack }
    ]);
  };

  const handleClearAll = () => {
    dispatch(clearItems());
    Alert.alert('Cleared', 'All items removed');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Add New Item</Text>
      <Text style={styles.subtitle}>Total Items: {count}</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Item name (e.g., Laptop)"
          value={itemName}
          onChangeText={setItemName}
        />
        <TextInput
          style={styles.input}
          placeholder="Description (optional)"
          value={itemDescription}
          onChangeText={setItemDescription}
        />
        
        {/* Date Picker */}
        <View style={styles.datePickerContainer}>
          <Text style={styles.datePickerLabel}>📅 Due Date:</Text>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              setSelectedDate(newDate);
              const formattedDate = `${newDate.getMonth() + 1}/${newDate.getDate()}/${newDate.getFullYear()}`;
              setDueDate(formattedDate);
            }}
            min={new Date().toISOString().split('T')[0]}
            style={{
              padding: 12,
              fontSize: 16,
              borderRadius: 8,
              border: '1px solid #4CAF50',
              backgroundColor: 'white',
              color: '#333',
              fontWeight: '600',
              cursor: 'pointer',
              flex: 1,
            }}
          />
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.buttonText}>Add Item</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
          <Text style={styles.buttonText}>Clear All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.listContainer}>
        {items.map((item) => {
          const isOverdue = new Date(item.dueDate) < new Date();
          return (
            <View 
              key={item.id} 
              style={[
                styles.itemCard, 
                isOverdue && styles.overdueCard
              ]}
            >
              <Text style={styles.itemName}>{item.name}</Text>
              {item.description && (
                <Text style={styles.itemDescription}>{item.description}</Text>
              )}
              <Text style={styles.itemDate}>Added: {item.date}</Text>
              <Text style={[styles.dueDate, isOverdue && styles.overdueDateText]}>
                Due: {item.dueDate} {isOverdue && '⚠️ OVERDUE'}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// Main App with Navigation
function BorrowingApp() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'dashboard' ? (
        <Dashboard onNavigateToAddItem={() => setCurrentScreen('addItem')} />
      ) : (
        <AddItemPage onNavigateBack={() => setCurrentScreen('dashboard')} />
      )}
    </View>
  );
}

// App with Redux Provider
export default function App() {
  return (
    <Provider store={store}>
      <BorrowingApp />
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2439',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#FFF',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#FFF',
  },
  backButton: {
    backgroundColor: '#1E3A5F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  // Dashboard Styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardBlue: {
    borderTopWidth: 4,
    borderTopColor: '#2196F3',
  },
  statCardRed: {
    borderTopWidth: 4,
    borderTopColor: '#f44336',
  },
  statCardOrange: {
    borderTopWidth: 4,
    borderTopColor: '#FF9800',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  addItemButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addItemButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertSection: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 10,
  },
  alertCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  alertItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  alertItemDate: {
    fontSize: 13,
    color: '#f44336',
    fontWeight: '600',
  },
  warnSection: {
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 10,
  },
  warnCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  warnItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  warnItemDate: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600',
  },
  recentSection: {
    marginBottom: 20,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 15,
  },
  recentCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  recentCardOverdue: {
    borderLeftColor: '#f44336',
    backgroundColor: '#ffebee',
  },
  recentItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recentItemDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  recentItemDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  datePickerContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  datePickerLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  dueDate: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginTop: 5,
  },
  overdueDateText: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  overdueCard: {
    borderLeftColor: '#f44336',
    backgroundColor: '#ffebee',
  },
});