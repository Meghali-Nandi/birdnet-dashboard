import axios from 'axios';

// export const BACKEND_URL = 'http://100.85.146.73:8888/api/';
export const BACKEND_URL = 'http://100.74.171.83:8888/api/';

// Create an axios instance
console.log(BACKEND_URL);
const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
