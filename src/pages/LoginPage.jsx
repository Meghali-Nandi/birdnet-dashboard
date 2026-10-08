import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';

import UNSW_Logo from '../assets/UNSW_Logo.jpeg';
import CSE_Logo from '../assets/CSE_Logo.jpeg';
import BEES_Logo from '../assets/BEES_Logo.png';
import animationData from '../assets/logo.json';

import axiosInstance from '../api';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const navigate = useNavigate();

  const handleLogin = async (e, email, password) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/auth/login', { username: email, password });
      localStorage.setItem('token', response.data.access_token);
      setErrorMessage('');
      navigate('/app/dashboard');
    } catch (error) {
      const msg = error.response?.data?.msg || 'Login failed. Please try again.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FCFDFC]">
      {/* Left: Logo illustration */}
      <div className="w-1/2 flex flex-col items-center justify-center bg-[#FCFDFC]">
        <LogoOnce />
      </div>

      {/* Right: Login form */}
      <div className="w-1/2 flex items-center justify-center px-8">
        <div className="w-full max-w-lg bg-gray-800 p-8 rounded-xl shadow-md">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
          </div>

          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-200">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-4 py-2 border border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-700 text-white"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block mb-1 text-sm font-medium text-gray-200">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="w-full px-4 py-2 border border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-700 text-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm font-medium"
              >
                {errorMessage}
              </motion.div>
            )}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-full py-2 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md"
              onClick={(e) => handleLogin(e, email, password)}
            >
              Sign in to your account
            </motion.button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-grow h-px bg-gray-600"></div>
          </div>

          <div className="flex items-center justify-start gap-3">
            <img src={UNSW_Logo} className="w-20 h-20" alt="UNSW Logo" />
            <img src={BEES_Logo} className="w-20 h-20" alt="BEES Logo" />
            <img src={CSE_Logo} className="w-20 h-20" alt="CSE Logo" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoOnce() {
  const lottieRef = useRef(null);
  const [done, setDone] = useState(false);

  return (
    <div className="relative flex flex-col items-center justify-center -translate-y-14 md:-translate-y-16">
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={false}
        autoplay
        onComplete={() => setDone(true)}
        className="w-[42rem] h-[42rem] md:w-[48rem] md:h-[48rem]"
        style={{ background: 'transparent' }}
      />
    </div>
  );
}
