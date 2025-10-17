import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
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

// Main App Component
function BorrowingApp() {
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  
  const dispatch = useDispatch();
  const { items, count } = useSelector(state => state.borrowing);

  const handleAddItem = () => {
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }
    
    dispatch(addItem({
      name: itemName,
      description: itemDescription
    }));
    
    setItemName('');
    setItemDescription('');
    Alert.alert('Success', 'Item added!');
  };

  const handleClearAll = () => {
    dispatch(clearItems());
    Alert.alert('Cleared', 'All items removed');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Borrowing Tracker</Text>
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
        {items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.itemDescription}>{item.description}</Text>
            )}
            <Text style={styles.itemDate}>Added: {item.date}</Text>
          </View>
        ))}
      </View>
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
});