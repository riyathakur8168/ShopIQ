import axios from 'axios';

const API = axios.create({ baseURL: 'http://127.0.0.1:5000/api' });

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

// Products
export const getProducts = () => API.get('/products/');
export const addProduct = (data) => API.post('/products/', data);
export const updateProduct = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}`);
export const getInventoryNotifications = () => API.get('/products/notifications');
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

// Invoices
export const getInvoices = () => API.get('/invoices/');
export const createInvoice = (data) => API.post('/invoices/', data);

export default API;
