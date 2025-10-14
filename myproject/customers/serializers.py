from rest_framework import serializers
from .models import Customer, Item, BorrowingTransaction

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'first_name', 'last_name', 'email', 'phone_number', 'created_at']
        read_only_fields = ['id', 'created_at']

class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ['id', 'name', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']

class BorrowingTransactionSerializer(serializers.ModelSerializer):
    borrower_name = serializers.CharField(source='borrower.first_name', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = BorrowingTransaction
        fields = ['id', 'item', 'borrower', 'borrower_name', 'item_name', 'date_issued', 'due_date', 'date_returned', 'status', 'is_overdue', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']
    
    def get_is_overdue(self, obj):
        return obj.is_overdue()
