import axios from 'axios';

const api = axios.create({
  baseURL: 'http://10.175.28.47:3000', 
});

export default api;
