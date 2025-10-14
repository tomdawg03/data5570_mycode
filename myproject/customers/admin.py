from django.contrib import admin
from .models import Customer, Item, BorrowingTransaction

# Register your models here.
@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'email', 'phone_number', 'created_at']
    list_filter = ['created_at']
    search_fields = ['first_name', 'last_name', 'email']
    ordering = ['-created_at']

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'description']
    ordering = ['-created_at']

@admin.register(BorrowingTransaction)
class BorrowingTransactionAdmin(admin.ModelAdmin):
    list_display = ['borrower', 'item', 'date_issued', 'due_date', 'date_returned', 'status', 'is_overdue_display']
    list_filter = ['status', 'date_issued', 'due_date']
    search_fields = ['borrower__first_name', 'borrower__last_name', 'item__name']
    ordering = ['-date_issued']
    date_hierarchy = 'date_issued'
    
    def is_overdue_display(self, obj):
        """Display if item is overdue with color coding"""
        if obj.is_overdue():
            return "🔴 Overdue"
        elif obj.status == 'returned':
            return "✅ Returned"
        else:
            return "🟡 Borrowed"
    is_overdue_display.short_description = 'Status'
