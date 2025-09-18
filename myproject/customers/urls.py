from django.urls import path
from . import views

urlpatterns = [
    path('customers/', views.CustomerListCreateView.as_view(), name='customer-list-create'),
    path('customers/<int:pk>/', views.CustomerDetailView.as_view(), name='customer-detail'),
]
