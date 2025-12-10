import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response, 
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; 

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const tokenLama = localStorage.getItem('token');
        const decodedUser: any = tokenLama ? jwtDecode(tokenLama) : null;
        
        if (!decodedUser) throw new Error("Invalid token");

        const response = await axios.post('http://localhost:3000/auth/refresh', {
          userId: decodedUser.sub, 
          refreshToken: refreshToken
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        return axiosInstance(originalRequest);

      } catch (refreshError) {
        console.error("Sesi habis, silakan login ulang.");
        localStorage.clear();
        window.location.href = '/login'; 
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;