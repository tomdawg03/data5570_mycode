from django.db import models
from django.utils import timezone

class Customer(models.Model):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class Item(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class BorrowingTransaction(models.Model):
    STATUS_CHOICES = [
        ('borrowed', 'Borrowed'),
        ('returned', 'Returned'),
        ('overdue', 'Overdue'),
    ]
    
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    borrower = models.ForeignKey(Customer, on_delete=models.CASCADE)
    date_issued = models.DateField()
    due_date = models.DateField()
    date_returned = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='borrowed')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.borrower} borrowed {self.item} on {self.date_issued}"
    
    def is_overdue(self):
        """Check if the item is overdue"""
        if self.status == 'returned':
            return False
        return timezone.now().date() > self.due_date
    
    def save(self, *args, **kwargs):
        """Automatically update status based on due date and return date"""
        if self.date_returned:
            self.status = 'returned'
        elif self.is_overdue():
            self.status = 'overdue'
        else:
            self.status = 'borrowed'
        super().save(*args, **kwargs)
