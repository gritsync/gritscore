import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { PlusIcon, PencilIcon, TrashIcon, ArrowDownTrayIcon, CalendarIcon, ChartPieIcon } from '@heroicons/react/24/outline';
import { budgetAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { toast } from 'react-hot-toast';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
const FREQUENCIES = ['one-time', 'weekly', 'monthly'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getMonthYear(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Helper to update a transaction
async function updateTransactionAPI(id, data) {
  return await budgetAPI.updateTransaction(id, data);
}
// Helper to delete a transaction
async function deleteTransactionAPI(id) {
  return await budgetAPI.deleteTransaction(id);
}
// Helper to update a category
async function updateCategoryAPI(id, data) {
  return await budgetAPI.updateCategory(id, data);
}
// Helper to delete a category
async function deleteCategoryAPI(id) {
  return await budgetAPI.deleteCategory(id);
}

export default function Budgeting() {
  const { user } = useAuth();
  const [month, setMonth] = useState(7);
  const [year, setYear] = useState(2025);
  const [tab, setTab] = useState('expense');
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ frequency: '', status: '', category: '' });
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemCategory, setAddItemCategory] = useState(null);
  const [newItem, setNewItem] = useState({ 
    amount: '', 
    date: '', 
    frequency: 'one-time', 
    description: '', 
    status: 'paid' 
  });
  const [showEditItem, setShowEditItem] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showDeleteItem, setShowDeleteItem] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  // Data from backend
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Category autocomplete state
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [allCategoryNames, setAllCategoryNames] = useState([]);
  const [newCategoryType, setNewCategoryType] = useState('expense');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');

  // All categories for dropdown (including default and user-added)
  const [allCategories, setAllCategories] = useState([]);

  // Function to check if a transaction is a debt payment
  const isDebtPayment = (transaction) => {
    if (transaction.is_debt_transaction) return true;
    
    // Check if the transaction belongs to a "Debt Payments" category
    const category = allCategories.find(cat => cat.id === transaction.category_id);
    return category && category.name === 'Debt Payments';
  };

  // Fetch all categories for dropdown (including default and user-added)
  useEffect(() => {
    async function fetchAllCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        
        if (error) {
          console.error('Error fetching all categories:', error);
          // Fallback to mock data
          const mockCategories = [
            // Default Expense Categories
            { id: 1, name: 'Food & Dining', type: 'expense', color: '#FF6B6B', is_default: true },
            { id: 2, name: 'Transportation', type: 'expense', color: '#4ECDC4', is_default: true },
            { id: 3, name: 'Entertainment', type: 'expense', color: '#45B7D1', is_default: true },
            { id: 4, name: 'Shopping', type: 'expense', color: '#FFA500', is_default: true },
            { id: 5, name: 'Utilities', type: 'expense', color: '#FF6347', is_default: true },
            { id: 6, name: 'Healthcare', type: 'expense', color: '#32CD32', is_default: true },
            { id: 7, name: 'Education', type: 'expense', color: '#9370DB', is_default: true },
            { id: 8, name: 'Housing', type: 'expense', color: '#8B4513', is_default: true },
            { id: 9, name: 'Insurance', type: 'expense', color: '#DC143C', is_default: true },
            { id: 10, name: 'Taxes', type: 'expense', color: '#FF4500', is_default: true },
            { id: 19, name: 'Debt Payments', type: 'expense', color: '#FF1493', is_default: true },
            // Default Income Categories
            { id: 11, name: 'Salary', type: 'income', color: '#96CEB4', is_default: true },
            { id: 12, name: 'Freelance', type: 'income', color: '#20B2AA', is_default: true },
            { id: 13, name: 'Investment', type: 'income', color: '#FFD700', is_default: true },
            { id: 14, name: 'Business', type: 'income', color: '#32CD32', is_default: true },
            { id: 15, name: 'Bonus', type: 'income', color: '#9370DB', is_default: true },
            { id: 16, name: 'Commission', type: 'income', color: '#FF69B4', is_default: true },
            { id: 17, name: 'Rental Income', type: 'income', color: '#00CED1', is_default: true },
            { id: 18, name: 'Dividends', type: 'income', color: '#FF8C00', is_default: true }
          ];
          setAllCategories(mockCategories);
          const names = mockCategories.map(cat => cat.name);
          setAllCategoryNames(names);
        } else {
          // Add is_default flag based on whether user_id is null (default) or has a value (user-added)
          // Default categories are those NOT assigned to a specific user (user_id is null)
          // These categories are available to ALL users
          const categoriesWithFlag = data.map(cat => ({
            ...cat,
            is_default: !cat.user_id // If user_id is null, it's a default category
          }));
          
          // If no categories found in Supabase, use mock data
          if (categoriesWithFlag.length === 0) {
            const mockCategories = [
              // Default Expense Categories
              { id: 1, name: 'Food & Dining', type: 'expense', color: '#FF6B6B', is_default: true },
              { id: 2, name: 'Transportation', type: 'expense', color: '#4ECDC4', is_default: true },
              { id: 3, name: 'Entertainment', type: 'expense', color: '#45B7D1', is_default: true },
              { id: 4, name: 'Shopping', type: 'expense', color: '#FFA500', is_default: true },
              { id: 5, name: 'Utilities', type: 'expense', color: '#FF6347', is_default: true },
              { id: 19, name: 'Debt Payments', type: 'expense', color: '#FF1493', is_default: true },
              // Default Income Categories
              { id: 11, name: 'Salary', type: 'income', color: '#96CEB4', is_default: true },
              { id: 12, name: 'Freelance', type: 'income', color: '#20B2AA', is_default: true },
              { id: 13, name: 'Investment', type: 'income', color: '#FFD700', is_default: true },
              { id: 14, name: 'Business', type: 'income', color: '#32CD32', is_default: true },
              { id: 15, name: 'Bonus', type: 'income', color: '#9370DB', is_default: true }
            ];
            setAllCategories(mockCategories);
            const names = mockCategories.map(cat => cat.name);
            setAllCategoryNames(names);
          } else {
            setAllCategories(categoriesWithFlag);
            const names = categoriesWithFlag.map(cat => cat.name);
            setAllCategoryNames(names);
          }
        }
      } catch (err) {
        console.error('Error fetching all categories:', err);
        // Fallback to mock data
        const mockCategories = [
          // Default Expense Categories
          { id: 1, name: 'Food & Dining', type: 'expense', color: '#FF6B6B', is_default: true },
          { id: 2, name: 'Transportation', type: 'expense', color: '#4ECDC4', is_default: true },
          { id: 3, name: 'Entertainment', type: 'expense', color: '#45B7D1', is_default: true },
          { id: 4, name: 'Shopping', type: 'expense', color: '#FFA500', is_default: true },
          { id: 5, name: 'Utilities', type: 'expense', color: '#FF6347', is_default: true },
          { id: 6, name: 'Healthcare', type: 'expense', color: '#32CD32', is_default: true },
          { id: 7, name: 'Education', type: 'expense', color: '#9370DB', is_default: true },
          { id: 8, name: 'Housing', type: 'expense', color: '#8B4513', is_default: true },
          { id: 9, name: 'Insurance', type: 'expense', color: '#DC143C', is_default: true },
          { id: 10, name: 'Taxes', type: 'expense', color: '#FF4500', is_default: true },
          { id: 19, name: 'Debt Payments', type: 'expense', color: '#FF1493', is_default: true },
          // Default Income Categories
          { id: 11, name: 'Salary', type: 'income', color: '#96CEB4', is_default: true },
          { id: 12, name: 'Freelance', type: 'income', color: '#20B2AA', is_default: true },
          { id: 13, name: 'Investment', type: 'income', color: '#FFD700', is_default: true },
          { id: 14, name: 'Business', type: 'income', color: '#32CD32', is_default: true },
          { id: 15, name: 'Bonus', type: 'income', color: '#9370DB', is_default: true },
          { id: 16, name: 'Commission', type: 'income', color: '#FF69B4', is_default: true },
          { id: 17, name: 'Rental Income', type: 'income', color: '#00CED1', is_default: true },
          { id: 18, name: 'Dividends', type: 'income', color: '#FF8C00', is_default: true }
        ];
        setAllCategories(mockCategories);
        const names = mockCategories.map(cat => cat.name);
        setAllCategoryNames(names);
      }
    }
    
    if (user) {
      fetchAllCategories();
    }
  }, [user]);

  // Filter category suggestions based on input
  useEffect(() => {
    if (categoryInput.trim()) {
      const filtered = allCategoryNames.filter(name =>
        name.toLowerCase().includes(categoryInput.toLowerCase())
      );
      setCategorySuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setCategorySuggestions([]);
      setShowSuggestions(false);
    }
  }, [categoryInput, allCategoryNames]);

  // Handle category selection
  const handleCategorySelect = (categoryName) => {
    setCategoryInput(categoryName);
    setShowSuggestions(false);
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSuggestions && !event.target.closest('.category-input-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  // Reset form when modal is closed
  const resetCategoryForm = () => {
    setCategoryInput('');
    setNewCategoryType('expense');
    setNewCategoryColor('#3b82f6');
    setShowSuggestions(false);
  };

  // Reset item form
  const resetItemForm = () => {
    setNewItem({ 
      amount: '', 
      date: '', 
      frequency: 'one-time', 
      dayOfWeek: 'Monday',
      description: '', 
      status: 'paid' 
    });
    setAddItemCategory(null);
  };

  // Handle form submission for adding category
  const handleAddCategory = async () => {
    if (!categoryInput.trim()) {
      alert('Please enter a category name');
      return;
    }
    
    try {
      // Call the API to add the category
      const response = await budgetAPI.addCategory({
        name: categoryInput,
        type: newCategoryType,
        color: newCategoryColor
      });
      
      console.log('Category added successfully:', response);
      setShowAddItem(false);
      resetCategoryForm();
      
      // Refresh categories list
      const catRes = await budgetAPI.getCategories();
      setCategories(catRes.data);
      
      // Refresh all categories for dropdown
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (data) {
        const categoriesWithFlag = data.map(cat => ({
          ...cat,
          is_default: !cat.user_id
        }));
        setAllCategories(categoriesWithFlag);
        const names = categoriesWithFlag.map(cat => cat.name);
        setAllCategoryNames(names);
      }
    } catch (err) {
      console.error('Failed to add category:', err);
      alert('Failed to add category. Please try again.');
    }
  };

  // Handle form submission for adding item
  const handleAddItem = async () => {
    if (!addItemCategory) {
      alert('Please select a category');
      return;
    }
    
    if (!newItem.description.trim()) {
      alert('Please enter an item name');
      return;
    }
    
    if (!newItem.amount) {
      alert('Please enter an amount');
      return;
    }
    
    if (!newItem.date) {
      alert('Please select a date');
      return;
    }
    
    try {
      // Determine amount sign based on tab
      const amount = tab === 'income' ? Math.abs(newItem.amount) : -Math.abs(newItem.amount);
      
      console.log('=== FRONTEND DEBUG ===');
      console.log('addItemCategory:', addItemCategory);
      console.log('newItem:', newItem);
      console.log('tab:', tab);
      console.log('calculated amount:', amount);
      
      // Build transaction data
      const transactionData = {
        category_id: addItemCategory.id,
        amount: amount,
        date: newItem.date,
        description: newItem.description,
        recurrence: newItem.frequency === 'one-time' ? null : newItem.frequency
      };
      if (tab === 'expense') {
        transactionData.status = newItem.status;
      }
      
      console.log('Sending transaction data:', transactionData);
      
      // Call the API to add the transaction
      const response = await budgetAPI.addTransaction(transactionData);
      
      console.log('Item added successfully:', response);
      
      // If this is a "Debt Payments" category, automatically create a debt item
      if (addItemCategory.name === 'Debt Payments') {
        try {
          const debtData = {
            item_name: newItem.description || 'Debt Payment',
            provider: 'Unknown Provider',
            due_date: new Date(newItem.date).getDate() + 'th',
            start_date: newItem.date,
            end_date: newItem.date, // You might want to calculate this based on recurrence
            duration: '1 month',
            original_amount: Math.abs(newItem.amount),
            current_balance: Math.abs(newItem.amount),
            monthly_payment: Math.abs(newItem.amount),
            status: 'pending'
          };
          
          await budgetAPI.addDebt(debtData);
          console.log('Debt item created successfully');
        } catch (debtError) {
          console.error('Error creating debt:', debtError);
        }
      }
      
      setShowAddItem(false);
      
      // Reset form
      setNewItem({ amount: '', date: '', frequency: 'one-time', description: '', status: 'paid' });
      setAddItemCategory(null);
      
      // Refresh transactions list
      const txRes = await budgetAPI.getTransactions();
      setTransactions(txRes.data);
      toast.success('Item added successfully!');
    } catch (err) {
      console.error('Failed to add item:', err);
      toast.error('Failed to add item. Please try again.');
    }
  };

  // Handle debt transaction status update
  const handleDebtTransactionStatusUpdate = async (transaction, newStatus) => {
    try {
      if (transaction.is_debt_transaction && transaction.debt_id) {
        // Extract month and year from transaction date
        const date = new Date(transaction.date);
        const month = date.getMonth() + 1; // 1-12
        const year = date.getFullYear();
        
        // Update debt payment status
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthKey = monthNames[month - 1];
        
        await budgetAPI.updatePaymentStatus(transaction.debt_id, {
          month: monthKey,
          year: year.toString(),
          paid: newStatus === 'paid'
        });
        
        // Sync with transactions
        await budgetAPI.syncDebtTransactions({
          debt_id: transaction.debt_id,
          month: monthKey,
          year: year.toString(),
          paid: newStatus === 'paid'
        });
        
        // Refresh data
        const [catRes, txRes, pendingDebtRes] = await Promise.all([
          budgetAPI.getCategories(),
          budgetAPI.getTransactions(),
          budgetAPI.getPendingDebtTransactions(month, year)
        ]);
        
        setCategories(catRes.data);
        const regularTransactions = txRes.data || [];
        const pendingDebtTransactions = pendingDebtRes.data || [];
        const filteredRegularTransactions = regularTransactions.filter(tx => 
          !tx.description?.includes(' - ') || !pendingDebtTransactions.some(debtTx => 
            debtTx.description === tx.description && debtTx.date === tx.date
          )
        );
        const combinedTransactions = [...filteredRegularTransactions, ...pendingDebtTransactions];
        setTransactions(combinedTransactions);
      }
    } catch (error) {
      console.error('Error updating debt transaction status:', error);
      alert('Failed to update debt transaction status');
    }
  };

  // Fetch categories and transactions
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, txRes, pendingDebtRes] = await Promise.all([
          budgetAPI.getCategories(),
          budgetAPI.getTransactions(),
          budgetAPI.getPendingDebtTransactions(month, year)
        ]);
        setCategories(catRes.data);
        
        // Combine regular transactions with pending debt transactions
        const regularTransactions = txRes.data || [];
        const pendingDebtTransactions = pendingDebtRes.data || [];
        
        // Filter out any existing debt transactions to avoid duplicates
        const filteredRegularTransactions = regularTransactions.filter(tx => 
          !tx.description?.includes(' - ') || !pendingDebtTransactions.some(debtTx => 
            debtTx.description === tx.description && debtTx.date === tx.date
          )
        );
        
        const combinedTransactions = [...filteredRegularTransactions, ...pendingDebtTransactions];
        setTransactions(combinedTransactions);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchData();
  }, [user, month, year]);

  // Filtering
  const selectedMonth = `${year}-${String(month).padStart(2, '0')}`;
  const filteredCategories = categories.filter(c => c.type === tab); // User-added categories only
  const allFilteredCategories = allCategories.filter(c => c.type === tab); // All categories (default + user-added)
  // Only show items for the current month in the table
  const items = transactions.filter(
    i =>
      getMonthYear(i.date) === selectedMonth &&
      allFilteredCategories.some(c => c.id === i.category_id) &&
      (!search || i.description?.toLowerCase().includes(search.toLowerCase()) || String(i.amount).includes(search)) &&
      (!filter.frequency || i.recurrence === filter.frequency) &&
      (!filter.category || i.category_id === Number(filter.category))
  );

  // Summary
  const totalIncome = transactions.filter(i => getMonthYear(i.date) === selectedMonth && i.amount > 0).reduce((a, b) => a + b.amount, 0);
  const totalExpense = transactions.filter(i => getMonthYear(i.date) === selectedMonth && i.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
  const netBalance = totalIncome - totalExpense;

  // Chart data - use all categories for chart
  const chartData = allFilteredCategories.map(cat => ({
    name: cat.name,
    value: items.filter(i => i.category_id === cat.id).reduce((a, b) => a + Math.abs(b.amount), 0)
  }));

  // Handlers (add/edit/delete can be implemented similarly using budgetAPI)
  const handleMonthChange = (delta) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setMonth(newMonth); setYear(newYear);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6 lg:px-0 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Advanced Budgeting</h1>
          <p className="mt-1 text-sm text-theme-primary">
            Modern, clean, and responsive budgeting for everyone.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="flex items-center gap-4">
            <button className="btn-secondary" onClick={() => handleMonthChange(-1)} aria-label="Previous Month">&lt;</button>
            <span className="text-lg font-semibold">{new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button className="btn-secondary" onClick={() => handleMonthChange(1)} aria-label="Next Month">&gt;</button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-text">Total Income</h3>
            <PlusIcon className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">${totalIncome.toLocaleString()}</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-text">Total Expenses</h3>
            <ChartPieIcon className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">${totalExpense.toLocaleString()}</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-text">Net Balance</h3>
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ${netBalance.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs for Category Management */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0 mb-6">
          <div className="flex gap-4">
            <button className={`px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'income' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-300'}`} onClick={() => setTab('income')}>Income</button>
            <button className={`px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'expense' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-300'}`} onClick={() => setTab('expense')}>Expense</button>
            <button className={`px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'settings' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-300'}`} onClick={() => setTab('settings')}>Settings</button>
          </div>
          {tab !== 'settings' ? (
            <button className="bg-black text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors" onClick={() => {
              setShowAddItem(true);
              resetItemForm();
            }}>
              Add Item
            </button>
          ) : (
            <button className="bg-black text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors" onClick={() => setShowAddItem(true)}>
              Add Category
            </button>
          )}
        </div>

        {/* Content based on tab */}
        {tab !== 'settings' ? (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-1 border-r border-gray-200">Category</th>
                    <th className="px-2 py-1 border-r border-gray-200">Item Name</th>
                    <th className="px-2 py-1 border-r border-gray-200">Frequency</th>
                    <th className="px-2 py-1 border-r border-gray-200">Amount</th>
                    <th className="px-2 py-1 border-r border-gray-200">Date</th>
                    <th className="px-2 py-1 border-r border-gray-200">Status</th>
                    <th className="px-2 py-1 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr className="border-b border-gray-100"><td colSpan={7} className="text-center text-gray-400 py-2">No items</td></tr>
                  )}
                  {items.map(item => {
                    const cat = allFilteredCategories.find(c => c.id === item.category_id);
                    return (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="px-2 py-1 border-r border-gray-200 font-semibold">
                          <span style={{ background: cat?.color, width: 12, height: 12, borderRadius: '50%', display: 'inline-block', marginRight: 6, border: '1px solid #ccc', verticalAlign: 'middle' }}></span>
                          {cat?.name || 'Unknown'}
                        </td>
                        <td className="px-2 py-1 border-r border-gray-200">{item.description}</td>
                        <td className="px-2 py-1 border-r border-gray-200">{item.recurrence}</td>
                        <td className={`px-2 py-1 border-r border-gray-200 font-semibold ${item.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>{item.amount > 0 ? '+' : ''}${Math.abs(item.amount)}</td>
                        <td className="px-2 py-1 border-r border-gray-200">{item.date}</td>
                        <td className="px-2 py-1 border-r border-gray-200">
                          {item.is_debt_transaction ? (
                            <select
                              value={item.status || 'missed'}
                              onChange={(e) => handleDebtTransactionStatusUpdate(item, e.target.value)}
                              className={`px-2 py-0.5 rounded text-xs font-semibold border-0 cursor-pointer ${item.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                            >
                              <option value="paid">Paid</option>
                              <option value="missed">Missed</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              item.status === 'paid' ? 'bg-green-100 text-green-700' :
                              item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              item.status === 'unpaid' || item.status === 'missed' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                          )}
                        </td>
                        <td className="px-2 py-1 flex gap-2 justify-center items-center">
                          <button title="Edit" onClick={() => { setEditItem(item); setShowEditItem(true); }}
                            className="bg-blue-500 hover:bg-blue-700 text-white rounded-full p-2 shadow transition-all"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {isDebtPayment(item) ? (
                            <button 
                              title="Delete from Debt Tracker" 
                              onClick={() => { 
                                toast.error('This is a debt payment. Please delete it from the Debt Tracker page instead.');
                              }}
                              className="bg-gray-400 cursor-not-allowed text-white rounded-full p-2 shadow transition-all"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          ) : (
                            <button title="Delete" onClick={() => { setDeleteItem(item); setShowDeleteItem(true); }}
                              className="bg-red-500 hover:bg-red-700 text-white rounded-full p-2 shadow transition-all"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">My Categories</h3>
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full text-sm border border-gray-200">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-1 border-r border-gray-200">Name</th>
                    <th className="px-2 py-1 border-r border-gray-200">Type</th>
                    <th className="px-2 py-1 border-r border-gray-200">Color</th>
                    <th className="px-2 py-1 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.filter(cat => !cat.is_default).length === 0 && (
                    <tr className="border-b border-gray-100"><td colSpan={4} className="text-center text-gray-400 py-2">No custom categories. Add your first category above!</td></tr>
                  )}
                  {categories.filter(cat => !cat.is_default).map(cat => (
                    <tr key={cat.id} className="border-b border-gray-100">
                      <td className="px-2 py-1 border-r border-gray-200 font-semibold">{cat.name}</td>
                      <td className="px-2 py-1 border-r border-gray-200">{cat.type.charAt(0).toUpperCase() + cat.type.slice(1)}</td>
                      <td className="px-2 py-1 border-r border-gray-200"><span style={{ background: cat.color, width: 18, height: 18, borderRadius: '50%', display: 'inline-block', border: '1px solid #ccc' }}></span></td>
                      <td className="px-2 py-1 flex gap-2 justify-center items-center">
                        <button title="Edit" onClick={() => { setEditItem(cat); setShowEditItem(true); }}
                          className="bg-blue-500 hover:bg-blue-700 text-white rounded-full p-2 shadow transition-all"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button title="Delete" onClick={() => { setDeleteItem(cat); setShowDeleteItem(true); }}
                          className="bg-red-500 hover:bg-red-700 text-white rounded-full p-2 shadow transition-all"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Itemized Settings - {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-1 border-r border-gray-200">Category</th>
                    <th className="px-2 py-1 border-r border-gray-200">Item Name</th>
                    <th className="px-2 py-1 border-r border-gray-200">Frequency</th>
                    <th className="px-2 py-1 border-r border-gray-200">Amount</th>
                    <th className="px-2 py-1 border-r border-gray-200">Start Date</th>
                    <th className="px-2 py-1 border-r border-gray-200">End Date</th>
                    <th className="px-2 py-1 border-r border-gray-200">Duration</th>
                    <th className="px-2 py-1 border-r border-gray-200">Status</th>
                    <th className="px-2 py-1 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(item => getMonthYear(item.date) === selectedMonth).length === 0 && (
                    <tr className="border-b border-gray-100"><td colSpan={9} className="text-center text-gray-400 py-2">No items for {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</td></tr>
                  )}
                  {transactions.filter(item => getMonthYear(item.date) === selectedMonth).map(item => {
                    const cat = allFilteredCategories.find(c => c.id === item.category_id);
                    const startDate = item.date;
                    const endDate = item.date;
                    const duration = '1 day';
                    return (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="px-2 py-1 border-r border-gray-200 font-semibold">
                          <span style={{ background: cat?.color, width: 12, height: 12, borderRadius: '50%', display: 'inline-block', marginRight: 6, border: '1px solid #ccc', verticalAlign: 'middle' }}></span>
                          {cat?.name || 'Unknown'}
                        </td>
                        <td className="px-2 py-1 border-r border-gray-200">{item.description}</td>
                        <td className="px-2 py-1 border-r border-gray-200">{item.recurrence}</td>
                        <td className={`px-2 py-1 border-r border-gray-200 font-semibold ${item.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>{item.amount > 0 ? '+' : ''}${Math.abs(item.amount)}</td>
                        <td className="px-2 py-1 border-r border-gray-200">{startDate}</td>
                        <td className="px-2 py-1 border-r border-gray-200">{endDate}</td>
                        <td className="px-2 py-1 border-r border-gray-200">{duration}</td>
                        <td className="px-2 py-1 border-r border-gray-200">
                          {item.is_debt_transaction ? (
                            <select
                              value={item.status || 'missed'}
                              onChange={(e) => handleDebtTransactionStatusUpdate(item, e.target.value)}
                              className={`px-2 py-0.5 rounded text-xs font-semibold border-0 cursor-pointer ${item.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                            >
                              <option value="paid">Paid</option>
                              <option value="missed">Missed</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              item.status === 'paid' ? 'bg-green-100 text-green-700' :
                              item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              item.status === 'unpaid' || item.status === 'missed' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                          )}
                        </td>
                        <td className="px-2 py-1 flex gap-2 justify-center items-center">
                          <button title="Edit" onClick={() => { setEditItem(item); setShowEditItem(true); }}
                            className="bg-blue-500 hover:bg-blue-700 text-white rounded-full p-2 shadow transition-all"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {isDebtPayment(item) ? (
                            <button 
                              title="Delete from Debt Tracker" 
                              onClick={() => { 
                                toast.error('This is a debt payment. Please delete it from the Debt Tracker page instead.');
                              }}
                              className="bg-gray-400 cursor-not-allowed text-white rounded-full p-2 shadow transition-all"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          ) : (
                            <button title="Delete" onClick={() => { setDeleteItem(item); setShowDeleteItem(true); }}
                              className="bg-red-500 hover:bg-red-700 text-white rounded-full p-2 shadow transition-all"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Data Visualization */}
      <div className="card">
        <h3 className="text-lg font-semibold text-theme-text mb-4">Income & Expenses by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#0ea5e9" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filtering & Search */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <input className="input flex-1" placeholder="Search by note or amount..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input" value={filter.frequency} onChange={e => setFilter(f => ({ ...f, frequency: e.target.value }))}>
            <option value="">All Frequencies</option>
            {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
          </select>
          <select className="input" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="missed">Missed</option>
          </select>
                            <select className="input" value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
                    <option value="">All Categories</option>
                    {allFilteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
          <button className="btn-secondary flex items-center gap-1" title="Export CSV">
            <ArrowDownTrayIcon className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Quick Tips/Insights */}
      <div className="card">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <div className="font-semibold text-blue-700 mb-1">💡 Budget Tip</div>
          <div className="text-blue-700 text-sm">Set aside at least 10% of your income for savings each month. Review your expenses regularly to spot trends and opportunities to save!</div>
        </div>
      </div>

      {/* Modals */}
      {/* Add Item Modal (only for Income/Expense tabs) */}
      {showAddItem && tab !== 'settings' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <PlusIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Add New Item for {tab.charAt(0).toUpperCase() + tab.slice(1)}</h3>
                    <p className="text-blue-100 text-sm">Add a new {tab} item to your budget</p>
                  </div>
                </div>
                <button 
                  className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all" 
                  onClick={() => {
                    setShowAddItem(false);
                    resetItemForm();
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category dropdown - only shows categories matching the current tab type (income/expense) */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Category
                    </label>
                    <select 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white" 
                      value={addItemCategory ? addItemCategory.id : ''} 
                      onChange={e => {
                        const selectedId = e.target.value;
                        
                        if (!selectedId || selectedId === '') {
                          setAddItemCategory(null);
                          return;
                        }
                        
                        const selectedCategory = allCategories.find(c => String(c.id) === String(selectedId));
                        setAddItemCategory(selectedCategory);
                      }} 
                      required
                    >
                      <option value="">Select a category</option>
                      {/* Show all categories for current tab (both default and user-added) */}
                      {allCategories.filter(cat => cat.type === tab).map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Item Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Item Name
                    </label>
                    <input 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" 
                      placeholder="Enter item name" 
                      value={newItem.description} 
                      onChange={e => setNewItem(i => ({ ...i, description: e.target.value }))} 
                      required 
                    />
                  </div>

                  {/* Frequency */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      Frequency
                    </label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                      value={newItem.frequency}
                      onChange={e => setNewItem(i => ({ ...i, frequency: e.target.value }))}
                    >
                      {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Recurring transactions will automatically appear for the next period unless deleted.</p>
                  </div>

                  {/* Date or Day of Week */}
                  {(newItem.frequency === 'one-time' || newItem.frequency === 'monthly') && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Date
                      </label>
                      <input
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        type="date"
                        value={newItem.date}
                        onChange={e => setNewItem(i => ({ ...i, date: e.target.value }))}
                        required
                      />
                    </div>
                  )}
                  {newItem.frequency === 'weekly' && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Every
                      </label>
                                              <select
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all bg-white"
                          value={newItem.date ? new Date(newItem.date).toLocaleDateString('en-US', { weekday: 'long' }) : 'Monday'}
                          onChange={e => {
                            // For weekly, we'll use the date to determine the day of week
                            const selectedDay = e.target.value;
                            const today = new Date();
                            const dayIndex = DAYS_OF_WEEK.indexOf(selectedDay);
                            const daysToAdd = (dayIndex - today.getDay() + 7) % 7;
                            const nextDate = new Date(today);
                            nextDate.setDate(today.getDate() + daysToAdd);
                            setNewItem(i => ({ ...i, date: nextDate.toISOString().split('T')[0] }));
                          }}
                          required
                        >
                          {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{day}</option>)}
                        </select>
                    </div>
                  )}

                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input 
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" 
                        placeholder="0.00" 
                        type="number" 
                        value={newItem.amount} 
                        onChange={e => setNewItem(i => ({ ...i, amount: e.target.value }))} 
                        required 
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                      Status
                    </label>
                    <select
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white ${
                        newItem.status === 'paid' ? 'bg-green-100 text-green-700' :
                        newItem.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        newItem.status === 'unpaid' || newItem.status === 'missed' ? 'bg-red-100 text-red-700' :
                        ''
                      }`}
                      value={newItem.status}
                      onChange={e => setNewItem(i => ({ ...i, status: e.target.value }))}
                    >
                      <option value="paid" className="bg-green-100 text-green-700">Paid</option>
                      <option value="pending" className="bg-yellow-100 text-yellow-700">Pending</option>
                      <option value="unpaid" className="bg-red-100 text-red-700">Unpaid</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button 
                    type="button" 
                    className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors" 
                    onClick={() => {
                      setShowAddItem(false);
                      resetItemForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105" 
                    onClick={handleAddItem}
                  >
                    Save Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Add Category Modal (only for Settings tab) */}
      {showAddItem && tab === 'settings' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <PlusIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Add New Category</h3>
                    <p className="text-green-100 text-sm">Create a new budget category</p>
                  </div>
                </div>
                <button 
                  className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all" 
                  onClick={() => setShowAddItem(false)}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Category Name */}
                  <div className="space-y-2 relative category-input-container">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Category Name
                    </label>
                    <div className="relative">
                      <input 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" 
                        placeholder="Enter category name" 
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                        onFocus={() => setShowSuggestions(categorySuggestions.length > 0)}
                        required 
                      />
                      {showSuggestions && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {categorySuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                              onClick={() => handleCategorySelect(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Type
                    </label>
                    <select 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                      value={newCategoryType}
                      onChange={(e) => setNewCategoryType(e.target.value)}
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>

                  {/* Color */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      Color
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {['#3b82f6', '#22c55e', '#ef4444', '#6366f1', '#f59e0b', '#8b5cf6'].map((color, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`w-8 h-8 rounded-lg border-2 transition-colors ${
                            newCategoryColor === color 
                              ? 'border-gray-600 scale-110' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewCategoryColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button 
                    type="button" 
                    className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors" 
                    onClick={() => setShowAddItem(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-700 hover:to-teal-700 transition-all transform hover:scale-105" 
                    onClick={handleAddCategory}
                  >
                    Create Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Edit Item Modal (Transaction or Category) */}
      {showEditItem && editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden">
            {/* Header */}
            <div className={`bg-gradient-to-r ${editItem.amount !== undefined ? 'from-blue-600 to-purple-600' : 'from-green-600 to-teal-600'} p-6 text-white`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  Edit {editItem.amount !== undefined ? 'Transaction' : 'Category'}
                </h3>
                <button className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all" onClick={() => setShowEditItem(false)}>
                  ×
                </button>
              </div>
            </div>
            {/* Form */}
            <div className="p-6">
              <form className="space-y-6" onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (editItem.amount !== undefined) {
                    // Transaction
                    const updated = {
                      description: editItem.description,
                      amount: Number(editItem.amount),
                      date: editItem.date,
                      recurrence: editItem.recurrence,
                      category_id: editItem.category_id,
                    };
                    if (editItem.status !== undefined) updated.status = editItem.status;
                    await updateTransactionAPI(editItem.id, updated);
                    // If category is Debt Payments, update debt payment status as well
                    const cat = allCategories.find(c => c.id === Number(editItem.category_id));
                    if (cat && cat.name === 'Debt Payments') {
                      // Update debt payment status
                      // Find the debt by description and date (or other unique identifier)
                      try {
                        // You may need to adjust this logic to match your backend
                        const debts = await budgetAPI.getDebts();
                        const debt = debts.data.find(d => d.item_name === editItem.description);
                        if (debt) {
                          // Update payment status for the correct month/year
                          const dateObj = new Date(editItem.date);
                          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                          const monthKey = monthNames[dateObj.getMonth()];
                          const year = dateObj.getFullYear().toString();
                          await budgetAPI.updatePaymentStatus(debt.id, {
                            month: monthKey,
                            year,
                            paid: editItem.status === 'paid'
                          });
                        }
                      } catch (err) {
                        // Ignore debt update error
                      }
                    }
                    setShowEditItem(false);
                    // Refresh
                    const txRes = await budgetAPI.getTransactions();
                    setTransactions(txRes.data);
                    toast.success('Item updated successfully!');
                  } else {
                    // Category
                    const updated = {
                      name: editItem.name,
                      type: editItem.type,
                      color: editItem.color,
                    };
                    await updateCategoryAPI(editItem.id, updated);
                    setShowEditItem(false);
                    // Refresh
                    const catRes = await budgetAPI.getCategories();
                    setCategories(catRes.data);
                    toast.success('Item updated successfully!');
                  }
                } catch (err) {
                  toast.error('Failed to update item. Please try again.');
                }
              }}>
                {editItem.amount !== undefined ? (
                  // Transaction form
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category dropdown */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Category
                      </label>
                      <select 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white" 
                        value={editItem.category_id} 
                        onChange={e => setEditItem(i => ({ ...i, category_id: e.target.value }))}
                        required
                      >
                        <option value="">Select a category</option>
                        {allCategories.filter(cat => cat.type === tab).map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    {/* Item Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Item Name
                      </label>
                      <input 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" 
                        placeholder="Enter item name" 
                        value={editItem.description} 
                        onChange={e => setEditItem(i => ({ ...i, description: e.target.value }))} 
                        required 
                      />
                    </div>
                    {/* Frequency */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        Frequency
                      </label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                        value={editItem.recurrence || 'one-time'}
                        onChange={e => setEditItem(i => ({ ...i, recurrence: e.target.value }))}
                      >
                        {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Recurring transactions will automatically appear for the next period unless deleted.</p>
                    </div>
                    {/* Date or Day of Week */}
                    {(editItem.recurrence === 'one-time' || editItem.recurrence === 'monthly' || !editItem.recurrence) && (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          Date
                        </label>
                        <input
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                          type="date"
                          value={editItem.date}
                          onChange={e => setEditItem(i => ({ ...i, date: e.target.value }))}
                          required
                        />
                      </div>
                    )}
                    {editItem.recurrence === 'weekly' && (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          Every
                        </label>
                        <select
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all bg-white"
                          value={editItem.date ? new Date(editItem.date).toLocaleDateString('en-US', { weekday: 'long' }) : 'Monday'}
                          onChange={e => {
                            // For weekly, we'll use the date to determine the day of week
                            const selectedDay = e.target.value;
                            const today = new Date();
                            const dayIndex = DAYS_OF_WEEK.indexOf(selectedDay);
                            const daysToAdd = (dayIndex - today.getDay() + 7) % 7;
                            const nextDate = new Date(today);
                            nextDate.setDate(today.getDate() + daysToAdd);
                            setEditItem(i => ({ ...i, date: nextDate.toISOString().split('T')[0] }));
                          }}
                          required
                        >
                          {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{day}</option>)}
                        </select>
                      </div>
                    )}
                    {/* Amount */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input 
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" 
                          placeholder="0.00" 
                          type="number" 
                          value={editItem.amount} 
                          onChange={e => setEditItem(i => ({ ...i, amount: e.target.value }))} 
                          required 
                        />
                      </div>
                    </div>
                    {/* Status */}
                    {editItem.status !== undefined && (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                          Status
                        </label>
                        <select
                          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white ${
                            editItem.status === 'paid' ? 'bg-green-100 text-green-700' :
                            editItem.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            editItem.status === 'unpaid' || editItem.status === 'missed' ? 'bg-red-100 text-red-700' :
                            ''
                          }`}
                          value={editItem.status}
                          onChange={e => setEditItem(i => ({ ...i, status: e.target.value }))}
                        >
                          <option value="paid" className="bg-green-100 text-green-700">Paid</option>
                          <option value="pending" className="bg-yellow-100 text-yellow-700">Pending</option>
                          <option value="unpaid" className="bg-red-100 text-red-700">Unpaid</option>
                          <option value="missed" className="bg-red-100 text-red-700">Missed</option>
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  // Category form
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Name</label>
                      <input className="input w-full" value={editItem.name} onChange={e => setEditItem(i => ({ ...i, name: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Type</label>
                      <select className="input w-full" value={editItem.type} onChange={e => setEditItem(i => ({ ...i, type: e.target.value }))}>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>
                  </>
                )}
                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button 
                    type="button" 
                    className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors" 
                    onClick={() => setShowEditItem(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
                  >
                    Save Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Delete Item Modal (Transaction or Category) */}
      {showDeleteItem && deleteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-red-600 to-pink-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Delete {deleteItem.amount !== undefined ? 'Transaction' : 'Category'}</h3>
                <button className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all" onClick={() => setShowDeleteItem(false)}>
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">Are you sure you want to delete: <span className="font-mono">{deleteItem.description || deleteItem.name}</span>?</div>
              <div className="flex gap-4 pt-4 border-t border-gray-200 mt-4">
                <button type="button" className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors" onClick={() => setShowDeleteItem(false)}>Cancel</button>
                <button type="button" className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-red-700 hover:to-pink-700 transition-all transform hover:scale-105" onClick={async () => {
                  try {
                    if (deleteItem.amount !== undefined) {
                      // Transaction
                      await deleteTransactionAPI(deleteItem.id);
                      setShowDeleteItem(false);
                      const txRes = await budgetAPI.getTransactions();
                      setTransactions(txRes.data);
                    } else {
                      // Category
                      await deleteCategoryAPI(deleteItem.id);
                      setShowDeleteItem(false);
                      const catRes = await budgetAPI.getCategories();
                      setCategories(catRes.data);
                    }
                    toast.success('Item deleted successfully!');
                  } catch (err) {
                    toast.error('Failed to delete item. Please try again.');
                  }
                }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper for minus icon
function MinusIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round" /></svg>
  );
}