import axios from 'axios';

const api = axios.create({
  baseURL: 'http://10.123.182.47:3000', 
});

export default api;
