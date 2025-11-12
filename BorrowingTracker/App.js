import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Modal } from 'react-native';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// API Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000'  // Local development
  : 'http://3.148.189.210:8000';  // Production - update with your EC2 IP

// Helper function to get or create customer
const getOrCreateCustomer = async (customerData) => {
  try {
    // Try to find existing customer by email
    const searchResponse = await fetch(`${API_BASE_URL}/api/customers/?search=${encodeURIComponent(customerData.email)}`);
    const searchResults = await searchResponse.json();
    const existingCustomer = searchResults.find(c => c.email === customerData.email);
    
    if (existingCustomer) {
      return existingCustomer;
    }
    
    // Create new customer
    const createResponse = await fetch(`${API_BASE_URL}/api/customers/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData),
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.email?.[0] || 'Failed to create customer');
    }
    
    return await createResponse.json();
  } catch (error) {
    throw error;
  }
};

// Async thunk to fetch transactions
const fetchTransactions = createAsyncThunk(
  'borrowing/fetchTransactions',
  async () => {
    const response = await fetch(`${API_BASE_URL}/api/transactions/`);
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    const transactions = await response.json();
    
    // Enrich transactions with full borrower and item details
    const enrichedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        try {
          const [borrowerResponse, itemResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/customers/${transaction.borrower}/`),
            fetch(`${API_BASE_URL}/api/items/${transaction.item}/`)
          ]);
          
          const borrower = borrowerResponse.ok ? await borrowerResponse.json() : {
            first_name: transaction.borrower_name || 'Unknown',
            last_name: '',
            email: '',
          };
          const item = itemResponse.ok ? await itemResponse.json() : {
            name: transaction.item_name || 'Unknown',
            description: '',
          };
          
          return {
            ...transaction,
            borrower,
            item,
          };
        } catch (error) {
          // Fallback to basic structure
          return {
            ...transaction,
            borrower: {
              first_name: transaction.borrower_name || 'Unknown',
              last_name: '',
              email: '',
            },
            item: {
              name: transaction.item_name || 'Unknown',
              description: '',
            },
          };
        }
      })
    );
    
    return enrichedTransactions;
  }
);

// Async thunk to create transaction
const createTransaction = createAsyncThunk(
  'borrowing/createTransaction',
  async (transactionData) => {
    try {
      // Step 1: Get or create customer
      const customer = await getOrCreateCustomer(transactionData.borrower);
      
      // Step 2: Create item
      const itemResponse = await fetch(`${API_BASE_URL}/api/items/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData.item),
      });
      
      if (!itemResponse.ok) {
        throw new Error('Failed to create item');
      }
      const item = await itemResponse.json();
      
      // Step 3: Create transaction
      const transactionResponse = await fetch(`${API_BASE_URL}/api/transactions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item: item.id,
          borrower: customer.id,
          date_issued: transactionData.date_issued,
          due_date: transactionData.due_date,
        }),
      });
      
      if (!transactionResponse.ok) {
        const error = await transactionResponse.json();
        throw new Error(error.detail || 'Failed to create transaction');
      }
      
      const transaction = await transactionResponse.json();
      
      // Return transaction with nested data for display
      return {
        ...transaction,
        borrower: customer,
        item: item,
      };
    } catch (error) {
      throw error;
    }
  }
);

// Redux slice
const borrowingSlice = createSlice({
  name: 'borrowing',
  initialState: {
    items: [],
    count: 0,
    loading: false,
    error: null,
  },
  reducers: {
    clearItems: (state) => {
      state.items = [];
      state.count = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch transactions
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.map(transaction => {
          const [year, month, day] = transaction.due_date.split('-');
          const formattedDate = `${month}/${day}/${year}`;
          return {
            ...transaction,
            dueDate: formattedDate,
            date: transaction.date_issued || new Date().toLocaleDateString(),
          };
        });
        state.count = state.items.length;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Create transaction
      .addCase(createTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.loading = false;
        const transaction = action.payload;
        const [year, month, day] = transaction.due_date.split('-');
        const formattedDate = `${month}/${day}/${year}`;
        state.items.push({
          ...transaction,
          dueDate: formattedDate,
          date: transaction.date_issued || new Date().toLocaleDateString(),
        });
        state.count = state.items.length;
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

const { clearItems } = borrowingSlice.actions;

// Redux store
const store = configureStore({
  reducer: {
    borrowing: borrowingSlice.reducer
  }
});

// Item Detail Modal Component
function ItemDetailModal({ visible, item, onClose }) {
  if (!item) return null;
  
  const borrower = item.borrower || {};
  const itemData = item.item || {};
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    if (dateString.includes('/')) return dateString; // Already formatted
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={true}>
            <Text style={styles.modalTitle}>Item Details</Text>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Borrower Information</Text>
              <Text style={styles.modalText}><Text style={styles.modalLabel}>Name:</Text> {borrower.first_name} {borrower.last_name}</Text>
              <Text style={styles.modalText}><Text style={styles.modalLabel}>Email:</Text> {borrower.email || 'N/A'}</Text>
              {borrower.phone_number && (
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Phone:</Text> {borrower.phone_number}</Text>
              )}
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Item Information</Text>
              <Text style={styles.modalText}><Text style={styles.modalLabel}>Item Name:</Text> {itemData.name || item.name}</Text>
              {itemData.description || item.description ? (
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Description:</Text> {itemData.description || item.description}</Text>
              ) : null}
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Dates</Text>
              <Text style={styles.modalText}><Text style={styles.modalLabel}>Date Issued:</Text> {formatDate(item.date_issued)}</Text>
              <Text style={styles.modalText}><Text style={styles.modalLabel}>Due Date:</Text> {formatDate(item.dueDate || item.due_date)}</Text>
            </View>
            
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Dashboard Component
function Dashboard({ onNavigateToAddItem }) {
  const { items, count, loading, error } = useSelector(state => state.borrowing);
  const dispatch = useDispatch();
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Fetch transactions on mount
  useEffect(() => {
    dispatch(fetchTransactions());
  }, [dispatch]);
  
  // Calculate stats
  const today = new Date();
  const overdueItems = items.filter(item => {
    const dueDate = item.due_date ? new Date(item.due_date) : new Date(item.dueDate);
    return dueDate < today;
  });
  const dueSoonItems = items.filter(item => {
    const dueDate = item.due_date ? new Date(item.due_date) : new Date(item.dueDate);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  });
  
  const handleItemPress = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };
  
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <ItemDetailModal 
        visible={modalVisible} 
        item={selectedItem} 
        onClose={handleCloseModal} 
      />
      <ScrollView style={styles.container}>
        <Text style={styles.title}>📊 Dashboard</Text>
        <Text style={styles.subtitle}>Borrowing Tracker Overview</Text>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}
        
        {loading && items.length === 0 && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      
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
            <TouchableOpacity 
              key={item.id} 
              style={styles.alertCard}
              onPress={() => handleItemPress(item)}
            >
              <Text style={styles.alertItemName}>{item.item?.name || item.name}</Text>
              <Text style={styles.alertItemBorrower}>Borrower: {item.borrower ? `${item.borrower.first_name} ${item.borrower.last_name}` : 'N/A'}</Text>
              <Text style={styles.alertItemDate}>Due: {item.dueDate || item.due_date}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Due Soon Items */}
      {dueSoonItems.length > 0 && (
        <View style={styles.warnSection}>
          <Text style={styles.warnTitle}>🔔 Due Soon (Next 3 Days)</Text>
          {dueSoonItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.warnCard}
              onPress={() => handleItemPress(item)}
            >
              <Text style={styles.warnItemName}>{item.item?.name || item.name}</Text>
              <Text style={styles.warnItemBorrower}>Borrower: {item.borrower ? `${item.borrower.first_name} ${item.borrower.last_name}` : 'N/A'}</Text>
              <Text style={styles.warnItemDate}>Due: {item.dueDate || item.due_date}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Items */}
      {items.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>📝 Recent Items</Text>
          {items.slice(-5).reverse().map((item) => {
            const dueDate = item.due_date ? new Date(item.due_date) : new Date(item.dueDate);
            const isOverdue = dueDate < today;
            return (
              <TouchableOpacity 
                key={item.id} 
                style={[
                  styles.recentCard,
                  isOverdue && styles.recentCardOverdue
                ]}
                onPress={() => handleItemPress(item)}
              >
                <Text style={styles.recentItemName}>{item.item?.name || item.name}</Text>
                <Text style={styles.recentItemBorrower}>Borrower: {item.borrower ? `${item.borrower.first_name} ${item.borrower.last_name}` : 'N/A'}</Text>
                {(item.item?.description || item.description) && (
                  <Text style={styles.recentItemDescription}>{item.item?.description || item.description}</Text>
                )}
                <Text style={styles.recentItemDate}>
                  Due: {item.dueDate || item.due_date} {isOverdue && '⚠️'}
                </Text>
              </TouchableOpacity>
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
    </View>
  );
}

// Add Item Component (formerly BorrowingApp)
function AddItemPage({ onNavigateBack }) {
  const [borrowerFirstName, setBorrowerFirstName] = useState('');
  const [borrowerLastName, setBorrowerLastName] = useState('');
  const [borrowerEmail, setBorrowerEmail] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const dispatch = useDispatch();
  const { items, count, loading, error } = useSelector(state => state.borrowing);

  const handleAddItem = async () => {
    if (!borrowerFirstName.trim()) {
      Alert.alert('Error', 'Please enter borrower first name');
      return;
    }
    
    if (!borrowerLastName.trim()) {
      Alert.alert('Error', 'Please enter borrower last name');
      return;
    }
    
    if (!borrowerEmail.trim()) {
      Alert.alert('Error', 'Please enter borrower email');
      return;
    }
    
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }
    
    if (!dueDate.trim()) {
      Alert.alert('Error', 'Please enter a due date');
      return;
    }
    
    const dateIssued = new Date().toISOString().split('T')[0];
    
    try {
      await dispatch(createTransaction({
        borrower: {
          first_name: borrowerFirstName.trim(),
          last_name: borrowerLastName.trim(),
          email: borrowerEmail.trim(),
          phone_number: borrowerPhone.trim() || null
        },
        item: {
          name: itemName.trim(),
          description: itemDescription.trim() || null
        },
        date_issued: dateIssued,
        due_date: selectedDate.toISOString().split('T')[0]
      })).unwrap();
      
      setBorrowerFirstName('');
      setBorrowerLastName('');
      setBorrowerEmail('');
      setBorrowerPhone('');
      setItemName('');
      setItemDescription('');
      setDueDate('');
      setSelectedDate(new Date());
      Alert.alert('Success', 'Item added! Returning to dashboard...', [
        { text: 'OK', onPress: onNavigateBack }
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add item. Please try again.');
    }
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
        <Text style={styles.sectionLabel}>Borrower Information</Text>
        <TextInput
          style={styles.input}
          placeholder="First Name *"
          value={borrowerFirstName}
          onChangeText={setBorrowerFirstName}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name *"
          value={borrowerLastName}
          onChangeText={setBorrowerLastName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email *"
          value={borrowerEmail}
          onChangeText={setBorrowerEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone (optional)"
          value={borrowerPhone}
          onChangeText={setBorrowerPhone}
          keyboardType="phone-pad"
        />
        
        <Text style={styles.sectionLabel}>Item Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Item name (e.g., Laptop) *"
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
          <Text style={styles.datePickerLabel}>Due Date *</Text>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => {
              const dateString = e.target.value;
              const [year, month, day] = dateString.split('-');
              setSelectedDate(new Date(dateString));
              const formattedDate = `${parseInt(month)}/${parseInt(day)}/${year}`;
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
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.addButton, loading && styles.buttonDisabled]} 
          onPress={handleAddItem}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add Item'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.clearButton, loading && styles.buttonDisabled]} 
          onPress={handleClearAll}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Clear All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.listContainer}>
        {items.map((item) => {
          const dueDate = item.due_date ? new Date(item.due_date) : new Date(item.dueDate);
          const isOverdue = dueDate < new Date();
          return (
            <View 
              key={item.id} 
              style={[
                styles.itemCard, 
                isOverdue && styles.overdueCard
              ]}
            >
              <Text style={styles.itemName}>{item.item?.name || item.name}</Text>
              <Text style={styles.itemBorrower}>Borrower: {item.borrower ? `${item.borrower.first_name} ${item.borrower.last_name} (${item.borrower.email})` : 'N/A'}</Text>
              {(item.item?.description || item.description) && (
                <Text style={styles.itemDescription}>{item.item?.description || item.description}</Text>
              )}
              <Text style={styles.itemDate}>Added: {item.date}</Text>
              <Text style={[styles.dueDate, isOverdue && styles.overdueDateText]}>
                Due: {item.dueDate || item.due_date} {isOverdue && '⚠️ OVERDUE'}
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
  alertItemBorrower: {
    fontSize: 13,
    color: '#666',
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
  warnItemBorrower: {
    fontSize: 13,
    color: '#666',
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
  recentItemBorrower: {
    fontSize: 13,
    color: '#666',
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
  sectionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 15,
    marginBottom: 10,
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
  itemBorrower: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    fontWeight: '600',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F2439',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
  },
  modalLabel: {
    fontWeight: '600',
    color: '#555',
  },
  modalCloseButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});