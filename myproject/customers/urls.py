from django.urls import path
from . import views

urlpatterns = [
    # Customer endpoints
    path('customers/', views.CustomerListCreateView.as_view(), name='customer-list-create'),
    path('customers/<int:pk>/', views.CustomerDetailView.as_view(), name='customer-detail'),
    
    # Item endpoints
    path('items/', views.ItemListCreateView.as_view(), name='item-list-create'),
    path('items/<int:pk>/', views.ItemDetailView.as_view(), name='item-detail'),
    
    # BorrowingTransaction endpoints
    path('transactions/', views.BorrowingTransactionListCreateView.as_view(), name='transaction-list-create'),
    path('transactions/<int:pk>/', views.BorrowingTransactionDetailView.as_view(), name='transaction-detail'),
    
    # Special filtered endpoints for mobile app
    path('transactions/overdue/', views.OverdueTransactionsView.as_view(), name='overdue-transactions'),
    path('transactions/active/', views.ActiveTransactionsView.as_view(), name='active-transactions'),
]
