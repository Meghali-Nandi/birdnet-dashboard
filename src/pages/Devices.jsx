import React from 'react';
import axiosInstance from '../api';
import { FaTerminal, FaDesktop, FaGlobe } from 'react-icons/fa';
import useDevicesStore from '../stores/useDevicesStore';

import { useLoader } from '../stores/useLoader';

function Devices() {
  const { devices, setDevices } = useDevicesStore();
  const [search, setSearch] = React.useState('');

  const { showLoader, hideLoader } = useLoader();

  React.useEffect(() => {
    const fetchDevices = async () => {
      try {
        showLoader();
        console.log('token', localStorage.getItem('token'));
        const response = await axiosInstance.get('/tailnet/devices', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        console.log('here: ', response.data);
        const filteredDevices = response.data.filter((device) =>
          device.hostname.toLowerCase().split('-')[1].startsWith('birdnetpi')
        );
        setDevices(filteredDevices);
      } catch (error) {
        console.error('Error fetching devices:', error);
      } finally {
        hideLoader();
      }
    };

    if (devices.length === 0) {
      fetchDevices();
    }
  }, []);

  const filtered = devices.filter((d) => d.hostname.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 h-full">
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <div className="py-4 bg-white ">
          <label htmlFor="table-search" className="sr-only">
            Search
          </label>

          <div className="relative mt-1 ml-2">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 20 20">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                />
              </svg>
            </div>
            <input
              type="text"
              id="table-search"
              className="block pl-10 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search devices"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <table className="w-full text-sm text-left text-gray-500 ">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 ">
            <tr>
              <th className="px-6 py-3">Hostname</th>
              <th className="px-6 py-3">IP Address</th>
              <th className="px-6 py-3">OS</th>
              <th className="px-6 py-3">Online</th>
              <th className="px-6 py-3">Version</th>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((device, i) => (
              <tr key={i} className="bg-white border-b  hover:bg-gray-50 ">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap ">{device.hostname}</td>
                <td className="px-6 py-4">{device.ip}</td>
                <td className="px-6 py-4 capitalize">{device.os}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      device.online ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  ></span>
                  {device.online ? 'Online' : 'Offline'}
                </td>
                <td className="px-6 py-4">{device.clientVersion}</td>
                <td className="px-6 py-4">{device.user}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <a
                      href={`http://${device.ip}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative text-blue-600 hover:text-blue-800 transition"
                    >
                      <FaGlobe className="w-5 h-5" />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                        Web Dashboard
                      </span>
                    </a>
                    <a
                      href={`ssh://cti@${device.ip}`}
                      className="group relative text-green-600 hover:text-green-800 transition"
                    >
                      <FaTerminal className="w-5 h-5" />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                        SSH Terminal
                      </span>
                    </a>
                    <a
                      href={`com.realvnc.vncviewer.connect://${device.ip}`}
                      className="group relative text-purple-600 hover:text-purple-800 transition"
                    >
                      <FaDesktop className="w-5 h-5" />
                      <span className="absolute z-50 -top-10 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none w-max max-w-[160px] text-center whitespace-normal shadow-md">
                        Connect to GUI
                      </span>
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500 ">
                  No matching devices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Devices;
