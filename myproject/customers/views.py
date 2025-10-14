from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Customer, Item, BorrowingTransaction
from .serializers import CustomerSerializer, ItemSerializer, BorrowingTransactionSerializer

# Customer Views
class CustomerListCreateView(generics.ListCreateAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'email']

class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

# Item Views
class ItemListCreateView(generics.ListCreateAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

class ItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer

# BorrowingTransaction Views
class BorrowingTransactionListCreateView(generics.ListCreateAPIView):
    queryset = BorrowingTransaction.objects.all()
    serializer_class = BorrowingTransactionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'borrower', 'item']
    search_fields = ['borrower__first_name', 'borrower__last_name', 'item__name']

class BorrowingTransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = BorrowingTransaction.objects.all()
    serializer_class = BorrowingTransactionSerializer

# Special filtered views for mobile app
class OverdueTransactionsView(generics.ListAPIView):
    queryset = BorrowingTransaction.objects.filter(status='overdue')
    serializer_class = BorrowingTransactionSerializer

class ActiveTransactionsView(generics.ListAPIView):
    queryset = BorrowingTransaction.objects.filter(status='borrowed')
    serializer_class = BorrowingTransactionSerializer