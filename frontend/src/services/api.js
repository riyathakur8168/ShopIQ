import axios from 'axios';

const API = axios.create({ baseURL: 'https://shopiq-iq8c.onrender.com/api' });

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401 or 422 (invalid token)
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 422) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => API.post('/auth/login', data);
export const signup = (data) => API.post('/auth/signup', data);
export const setupBusiness = (data) => API.post('/auth/business-setup', data);
export const getMe = () => API.get('/auth/me');
export const sendOtp = (type, value) => API.post('/auth/send-otp', { type, value });
export const verifyOtp = (type, value, otp) => API.post('/auth/verify-otp', { type, value, otp });
export const sendForgotPasswordOtp = (type, value) => API.post('/auth/forgot-password/send-otp', { type, value });
export const verifyForgotPasswordOtp = (type, value, otp) => API.post('/auth/forgot-password/verify-otp', { type, value, otp });
export const resetForgotPassword = (type, value, otp, password) => API.post('/auth/forgot-password/reset', { type, value, otp, password });
export const getPublicMetrics = () => API.get('/public/metrics');

// Products
export const getProducts = (params) => API.get('/products/', { params });
export const addProduct = (data) => API.post('/products/', data);
export const updateProduct = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}`);
export const getInventoryNotifications = () => API.get('/products/notifications');
export const getCategories = () => API.get('/products/categories');
export const addCategory = (data) => API.post('/products/categories', data);
export const renameCategory = (id, data) => API.put(`/products/categories/${id}`, data);
export const deleteCategory = (id) => API.delete(`/products/categories/${id}`);
export const uploadOCRImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return API.post('/products/ocr-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Sales
export const getSales = (params) => API.get('/sales/', { params });
export const addSale = (data) => API.post('/sales/', data);
export const deleteSale = (id) => API.delete(`/sales/${id}`);
export const getSalesAnalytics = (params) => API.get('/sales/analytics', { params });
export const uploadSalesCSV = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return API.post('/sales/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Customers
export const getCustomers = (params) => API.get('/customers/', { params });
export const addCustomer = (data) => API.post('/customers/', data);
export const updateCustomer = (id, data) => API.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => API.delete(`/customers/${id}`);
export const getCustomer = (id) => API.get(`/customers/${id}`);
export const addCredit = (id, data) => API.post(`/customers/${id}/credit`, data);
export const recordPayment = (id, data) => API.post(`/customers/${id}/payment`, data);
export const checkCustomerPhone = (phone, excludeId) => API.get('/customers/check-phone', { params: { phone, exclude_id: excludeId } });

// Suppliers
export const getSuppliers = (params) => API.get('/suppliers/', { params });
export const addSupplier = (data) => API.post('/suppliers/', data);
export const updateSupplier = (id, data) => API.put(`/suppliers/${id}`, data);
export const deleteSupplier = (id) => API.delete(`/suppliers/${id}`);
export const getSupplier = (id) => API.get(`/suppliers/${id}`);
export const addSupplierPurchase = (id, data) => API.post(`/suppliers/${id}/purchase`, data);
export const recordSupplierPayment = (id, data) => API.post(`/suppliers/${id}/payment`, data);
export const quickSupplier = (data) => API.post('/v1/purchases/quick-supplier', data);
export const quickProduct = (data) => API.post('/v1/purchases/quick-product', data);

// Invoices
export const getInvoices = () => API.get('/invoices/');
export const createInvoice = (data) => API.post('/invoices/', data);

export default API;
