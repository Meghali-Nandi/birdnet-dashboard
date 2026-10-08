// AppLayout.jsx
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MdSpaceDashboard, MdDevicesOther, MdTimeline, MdAdminPanelSettings } from 'react-icons/md';
import { RiLiveFill, RiRobot2Fill } from 'react-icons/ri';
import { LuBird } from 'react-icons/lu';
import { FaMapMarkedAlt } from 'react-icons/fa';
import { IoRecordingSharp } from 'react-icons/io5';
import { DiGoogleAnalytics } from 'react-icons/di';
import { motion, AnimatePresence } from 'framer-motion';
import { IoIosArrowDown, IoIosArrowForward } from 'react-icons/io';
import { BsCircleFill } from 'react-icons/bs';
import UNSW_Logo from './assets/UNSW_Logo.jpeg';
import Bowerbird_Logo from './assets/Logo4.png';
import default_user_avatar from './assets/default_user_avatar.png';
import useMenuStore from './stores/useMenuStore';

import TailnetChecker from './components/TailnetChecker';

import useDevicesStore from './stores/useDevicesStore';

import { BiArchiveIn } from 'react-icons/bi';

import { useLoader } from './stores/useLoader';
import Loader from './components/Loader';

import Spinner from './components/Spinner';
import AssistantPanel from './components/AiAssistantPanel';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activePath, setActivePath } = useMenuStore();
  const [devicesExpanded, setDevicesExpanded] = useState(false);

  const [showBetaBanner, setShowBetaBanner] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [reportExpanded, setReportExpanded] = useState(false);

  const { devices } = useDevicesStore();

  const { loading } = useLoader();

  const toggleBanner = () => {
    if (collapsed) {
      setCollapsed(false);
    } else {
      setShowBetaBanner(false);
      setTimeout(() => setCollapsed(true), 300);
    }
  };

  useEffect(() => {
    setActivePath(location.pathname === '/app/' ? '/dashboard' : location.pathname);
    setDevicesExpanded(location.pathname.startsWith('/app/devices'));

    setReportExpanded(isReportPath(location.pathname));
  }, [location.pathname]);

  const handleNavigate = (path) => {
    navigate(path);
  };

  const reportChildren = [
    { path: '/app/species', label: 'Species', icon: <LuBird /> },
    // { path: '/app/timeline', label: 'Timeline', icon: <MdTimeline /> },
    // { path: '/app/analysis', label: 'Analysis', icon: <DiGoogleAnalytics /> },
  ];

  const isReportPath = (p) =>
    p === '/app/species' || p === '/app/timeline' || p === '/app/analysis' || p.startsWith('/app/report');

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start rtl:justify-end">
              <a className="flex ms-2 md:me-24">
                <img src={Bowerbird_Logo} className=" rounded-lg h-12 me-3" alt="BowerBird Logo" />
                <span className="self-center text-xl font-semibold sm:text-2xl whitespace-nowrap dark:text-white">
                  <span className="text-[#FEDC00]">Bower</span>Bird Acoustic Biodiversity Monitoring Dashboard
                </span>
              </a>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setAssistantOpen(true)}
                className="inline-flex items-center gap-1 me-3 rounded-xl px-4 py-2 font-semibold text-black shadow-sm hover:shadow-md active:scale-95 transition-all"
                style={{
                  backgroundColor: '#FEDC00',
                }}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg ">
                  <RiRobot2Fill className="text-black" size={16} />
                </span>
                <span className="text-sm font-bold tracking-tight">AI Assistant</span>
              </button>

              <div className="flex items-center ms-3">
                <img className="w-10 h-10 rounded-full" src={default_user_avatar} alt="default user avatar" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 z-40 w-64 h-screen pt-20 bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700">
        <div className="h-full px-3 pb-0 flex flex-col justify-between bg-gray-800">
          {/* Scrollable Menu Items */}
          <div className="overflow-y-auto pr-1">
            <ul className="space-y-2 font-medium">
              {/* Static Menu Items */}
              <li className="relative">
                {activePath === '/app/dashboard' && (
                  <motion.div
                    layoutId="activeMenuIndicator"
                    className="absolute inset-0 rounded-lg"
                    style={{ backgroundColor: '#FEDC00' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                  />
                )}
                <a
                  onClick={() => handleNavigate('/app/dashboard')}
                  className={`relative z-10 flex items-center p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                    activePath === '/app/dashboard' ? 'text-black font-semibold' : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <MdSpaceDashboard />
                  <span className="ms-3 text-lg">Dashboard</span>
                </a>
              </li>

              {/* Expandable Devices Menu */}
              <li className="relative">
                <div
                  onClick={() => handleNavigate('/app/devices')}
                  className={`relative z-10 flex items-center p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                    activePath.startsWith('/app/devices')
                      ? 'text-black font-semibold bg-yellow-300'
                      : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <MdDevicesOther />
                  <span className="ms-3 text-lg flex-1">Devices</span>
                  {devicesExpanded ? devices.length > 0 ? <IoIosArrowDown /> : <Spinner /> : <IoIosArrowForward />}
                </div>
                <AnimatePresence>
                  {devicesExpanded && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="ml-6 mt-1 space-y-1 text-sm"
                    >
                      {devices.map((pi) => (
                        <li key={pi.ip}>
                          <a
                            onClick={() => handleNavigate(`/app/devices/${pi.hostname}`)}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
                              activePath === `/app/devices/${pi.hostname}`
                                ? 'bg-gray-700 text-yellow-300'
                                : 'text-white hover:bg-gray-700'
                            }`}
                          >
                            <BsCircleFill
                              className={`w-2.5 h-2.5 ${pi.online === true ? 'text-green-500' : 'text-red-500'}`}
                            />
                            {pi.hostname}
                          </a>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>

              {/* Other Menu Items */}
              {[
                // ['live', 'Live', <RiLiveFill />],
                ['map', 'Map', <FaMapMarkedAlt />],
                ['model', 'Model', <RiRobot2Fill />],
                ['recordings', 'Recordings', <IoRecordingSharp />],
                // ['admin', 'Admin', <MdAdminPanelSettings />],
              ].map(([path, label, icon]) => (
                <li key={path} className="relative">
                  {activePath === `/app/${path}` && (
                    <motion.div
                      layoutId="activeMenuIndicator"
                      className="absolute inset-0 rounded-lg"
                      style={{ backgroundColor: '#FEDC00' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                    />
                  )}
                  <a
                    onClick={() => handleNavigate(`/app/${path}`)}
                    className={`relative z-10 flex items-center p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                      activePath === `/app/${path}` ? 'text-black font-semibold' : 'text-white hover:bg-gray-700'
                    }`}
                  >
                    {icon}
                    <span className="ms-3 text-lg">{label}</span>
                  </a>
                </li>
              ))}

              {/* Expandable Report Menu */}
              <li className="relative">
                <div
                  onClick={() => {
                    if (!isReportPath(location.pathname)) handleNavigate('/app/species');
                    setReportExpanded((v) => !v);
                  }}
                  className={`relative z-10 flex items-center p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                    isReportPath(activePath) ? 'text-black font-semibold bg-yellow-300' : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <DiGoogleAnalytics />
                  <span className="ms-3 text-lg flex-1">Report</span>
                  {reportExpanded ? <IoIosArrowDown /> : <IoIosArrowForward />}
                </div>

                <AnimatePresence>
                  {reportExpanded && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="ml-6 mt-1 space-y-1 text-sm"
                    >
                      {reportChildren.map((item) => (
                        <li key={item.path}>
                          <a
                            onClick={() => handleNavigate(item.path)}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
                              activePath === item.path ? 'bg-gray-700 text-yellow-300' : 'text-white hover:bg-gray-700'
                            }`}
                          >
                            <span className="w-4 h-4 inline-flex items-center justify-center">{item.icon}</span>
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            </ul>
          </div>

          {/* Bottom Banner */}
          <div className="mt-4">
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 60, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="p-3 bg-blue-50 dark:bg-gray-700 rounded-t-lg shadow-md text-sm text-blue-800 dark:text-white"
                >
                  <TailnetChecker />
                </motion.div>
              )}
            </AnimatePresence>

            {collapsed && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-blue-100 dark:bg-gray-600 px-2 py-1 rounded-t-md text-center text-xs cursor-pointer text-blue-800 dark:text-white"
                onClick={toggleBanner}
              >
                <BiArchiveIn className="inline-block w-4 h-4" />
              </motion.div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      {/* <main className="flex-1 overflow-y-auto mt-[65px] ml-0 sm:ml-64 bg-gray-100 dark:bg-gray-200 p-6">
        <Outlet />
      </main> */}

      {/* Main Content */}
      <main className="relative flex-1 overflow-y-auto mt-[65px] ml-0 sm:ml-64 bg-gray-100 dark:bg-gray-200 p-6">
        <div aria-hidden={loading}>
          <Outlet />
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div
              key="section-loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center"
              aria-busy="true"
              aria-live="polite"
            >
              <Loader />
            </motion.div>
          )}
        </AnimatePresence>
        <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      </main>
    </div>
  );
}
