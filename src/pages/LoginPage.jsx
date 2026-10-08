import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Lottie from 'lottie-react'

import UNSW_Logo from '../assets/UNSW_Logo.jpeg'
import CSE_Logo from '../assets/CSE_Logo.jpeg'
import BEES_Logo from '../assets/BEES_Logo.png'
import animationData from '../assets/logo.json'

import axiosInstance from '../api'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()

    setLoading(true)
    setErrorMessage('')

    try {
      await axiosInstance.post('/auth/login', {
        username: email,
        password,
      })

      navigate('/app/dashboard')
    } catch (error) {
      const msg =
        error.response?.data?.msg ||
        'Login failed. Please try again.'

      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#FCFDFC]">
      {/* Left side */}
      <div className="flex w-1/2 flex-col items-center justify-center bg-[#FCFDFC]">
        <LogoOnce />
      </div>

      {/* Right side */}
      <div className="flex w-1/2 items-center justify-center px-8">
        <div className="w-full max-w-lg rounded-xl bg-gray-800 p-8 shadow-md">
          <div className="mb-6">
            <h2 className="mb-2 text-3xl font-bold text-white">
              Welcome back
            </h2>
          </div>

          <form
            className="space-y-4"
            onSubmit={handleLogin}
          >
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-200"
              >
                Email
              </label>

              <input
                type="email"
                id="email"
                required
                autoComplete="username"
                className="w-full rounded-md border border-gray-700 bg-gray-700 px-4 py-2 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="name@email.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-200"
              >
                Password
              </label>

              <input
                type="password"
                id="password"
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-gray-700 bg-gray-700 px-4 py-2 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
              />
            </div>

            {errorMessage && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="text-sm font-medium text-red-400"
              >
                {errorMessage}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={
                loading
                  ? {}
                  : { scale: 1.02 }
              }
              whileTap={
                loading
                  ? {}
                  : { scale: 0.97 }
              }
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
              className="mt-4 w-full rounded-md bg-blue-600 py-2 font-semibold text-white shadow-md hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Signing in...'
                : 'Sign in to your account'}
            </motion.button>
          </form>

          <div className="my-6 flex items-center">
            <div className="h-px flex-grow bg-gray-600" />
          </div>

          <div className="flex items-center justify-start gap-3">
            <img
              src={UNSW_Logo}
              className="h-20 w-20"
              alt="UNSW Logo"
            />

            <img
              src={BEES_Logo}
              className="h-20 w-20"
              alt="BEES Logo"
            />

            <img
              src={CSE_Logo}
              className="h-20 w-20"
              alt="CSE Logo"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function LogoOnce() {
  const lottieRef = useRef(null)

  return (
    <div className="relative flex -translate-y-14 flex-col items-center justify-center md:-translate-y-16">
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={false}
        autoplay
        className="h-[42rem] w-[42rem] md:h-[48rem] md:w-[48rem]"
        style={{
          background: 'transparent',
        }}
      />
    </div>
  )
}