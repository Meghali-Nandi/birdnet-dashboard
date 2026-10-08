// src/pages/Recordings.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '../api';
import { useLoader } from '../stores/useLoader';

const SERVERS = [{ id: 'srvA', name: 'Field Server', baseUrl: 'http://100.85.146.73:5173' }];

export default function Recordings() {
  const [serverIdx, setServerIdx] = useState(0);
  const server = SERVERS[serverIdx] || { baseUrl: '' };

  const [devices, setDevices] = useState([]);
  const [device, setDevice] = useState('');
  const [roots, setRoots] = useState([]);
  const [root, setRoot] = useState('');
  const [cwd, setCwd] = useState('');

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const { loading, showLoader, hideLoader } = useLoader();
  const [selected, setSelected] = useState(new Set());

  const req = (config) => axiosInstance({ baseURL: server.baseUrl, ...config });

  // ===== 服务器 -> 设备 =====
  useEffect(() => {
    if (!server.baseUrl) return;
    (async () => {
      try {
        const { data } = await req({ url: '/api/recordings/devices', method: 'GET' });
        setDevices(data?.devices || []);
      } catch {
        setDevices([]);
      }
    })();
    // reset downstream
    setDevice('');
    setRoots([]);
    setRoot('');
    setCwd('');
    setItems([]);
    setSelected(new Set());
    setTotal(0);
  }, [serverIdx]);

  // ===== 设备 -> 根目录 =====
  useEffect(() => {
    if (!server.baseUrl || !device) return;
    (async () => {
      try {
        const { data } = await req({ url: '/api/recordings/roots', method: 'GET', params: { device } });
        setRoots(data?.roots || []);
      } catch {
        setRoots([]);
      }
    })();
    setRoot('');
    setCwd('');
    setItems([]);
    setSelected(new Set());
    setTotal(0);
  }, [device]);

  // ===== 面包屑 =====
  const breadcrumbs = useMemo(() => {
    if (!device) return [];
    const parts = (cwd || '').split('/').filter(Boolean);
    const list = [{ name: device, path: '::device' }];
    if (root) list.push({ name: root, path: '' });
    parts.forEach((p, i) => list.push({ name: p, path: parts.slice(0, i + 1).join('/') }));
    return list;
  }, [device, root, cwd]);

  const goCrumb = (p) => {
    if (p === '::device') {
      // 关键修复：返回设备列表
      setDevice('');
      setRoot('');
      setCwd('');
      setItems([]);
      setSelected(new Set());
      setTotal(0);
      return;
    }
    // 回到某个子路径
    setCwd(p);
  };

  // ===== 列表（无分页：一次性拿全量）=====
  const fetchList = async () => {
    if (!server.baseUrl || !device || !root) return;
    showLoader();
    try {
      const { data } = await req({
        url: '/api/recordings/list',
        method: 'GET',
        params: { device, root, subpath: cwd },
      });
      const dItems = data?.items || [];
      const normalized = dItems.map((x) => ({
        ...x,
        is_audio: !x.is_dir && /\.(mp3|wav)$/i.test(x.name),
      }));
      setItems(normalized);
      setTotal(normalized.length);
      // 勾选状态清空，避免旧路径残留
      setSelected(new Set());
    } catch (e) {
      console.error(e);
      setItems([]);
      setTotal(0);
      setSelected(new Set());
    } finally {
      hideLoader();
    }
  };

  useEffect(() => {
    if (!root) return;
    fetchList();
  }, [root, cwd]);

  // ===== 选择与操作 =====
  const openDir = (row) => {
    if (row.is_dir) setCwd(row.path);
  };

  const toggle = (p) => {
    const s = new Set(selected);
    s.has(p) ? s.delete(p) : s.add(p);
    setSelected(s);
  };

  // 当前页可选文件（mp3/wav）
  const visibleFilePaths = useMemo(() => items.filter((x) => x.is_audio).map((x) => x.path), [items]);
  const selectedOnPage = useMemo(() => visibleFilePaths.filter((p) => selected.has(p)), [visibleFilePaths, selected]);
  const allOnPageSelected = visibleFilePaths.length > 0 && selectedOnPage.length === visibleFilePaths.length;
  const someOnPageSelected = selectedOnPage.length > 0 && !allOnPageSelected;

  // 表头主复选框半选状态；仅当“存在可选文件”时显示
  const headCbRef = useRef(null);
  useEffect(() => {
    if (headCbRef.current) headCbRef.current.indeterminate = someOnPageSelected;
  }, [someOnPageSelected]);

  const toggleSelectAllPage = () => {
    const s = new Set(selected);
    if (allOnPageSelected) {
      visibleFilePaths.forEach((p) => s.delete(p));
    } else {
      visibleFilePaths.forEach((p) => s.add(p));
    }
    setSelected(s);
  };

  const downloadOne = (row) => {
    if (row.is_dir) return;
    const u = new URL(`${server.baseUrl}/api/recordings/download`);
    u.searchParams.set('device', device);
    u.searchParams.set('root', root);
    u.searchParams.set('path', row.path);
    const a = document.createElement('a');
    a.href = u.toString();
    a.download = row.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} file(s)? (and *.mp3.png if exists)`)) return;
    await req({
      url: '/api/recordings/delete',
      method: 'POST',
      data: { device, root, paths: Array.from(selected) },
    });
    fetchList();
  };

  const zipSelected = async () => {
    if (!selected.size) return;
    const filename = `${device}_${root || 'root'}_${(cwd || '').replace(/\//g, '-') || 'top'}.zip`;
    const res = await req({
      url: '/api/recordings/zip',
      method: 'POST',
      data: { device, root, paths: Array.from(selected) },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ===== UI =====
  return (
    <div className="p-4 space-y-3">
      {/* 顶部：服务器下拉 + 灰色路径（点击设备名可回到设备列表） */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="px-3 py-2 rounded-md border bg-white"
          value={serverIdx}
          onChange={(e) => setServerIdx(parseInt(e.target.value, 10))}
        >
          {SERVERS.map((s, i) => (
            <option key={s.id || i} value={i}>
              {s.name || s.baseUrl}
            </option>
          ))}
        </select>

        <nav className="text-sm text-gray-600">
          {breadcrumbs.length === 0 ? (
            <span className="text-gray-400">Select a Pi to start</span>
          ) : (
            breadcrumbs.map((b, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-2 text-gray-300">/</span>}
                <button className="hover:underline" onClick={() => goCrumb(b.path)}>
                  {b.name}
                </button>
              </span>
            ))
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-md bg-gray-100 border"
            onClick={() => fetchList()}
            disabled={!root}
            title={!root ? 'Pick a folder first' : ''}
          >
            Refresh
          </button>
          <button
            className="px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
            disabled={!selected.size}
            onClick={zipSelected}
            title={selected.size ? 'Download selected as ZIP' : 'Select files first'}
          >
            Download ZIP
          </button>
          <button
            className="px-3 py-2 rounded-md bg-red-600 text-white disabled:opacity-50"
            disabled={!selected.size}
            onClick={deleteSelected}
          >
            Delete
          </button>
        </div>
      </div>

      {/* 列表卡片 */}
      <div className="bg-white rounded-lg shadow border">
        {/* 表头：只有在“存在可选文件”时显示主复选框 */}
        <div className="grid grid-cols-[32px_1fr_160px_160px_120px] px-4 py-2 text-xs font-semibold text-gray-500 border-b">
          <div>
            {root && visibleFilePaths.length > 0 && (
              <input
                ref={headCbRef}
                type="checkbox"
                checked={allOnPageSelected}
                onChange={toggleSelectAllPage}
                title="Select all files on this page"
              />
            )}
          </div>
          <div>Name</div>
          <div>Size</div>
          <div>Modified</div>
          <div>Action</div>
        </div>

        {/* A. 设备列表（初始） */}
        {!device &&
          devices.map((name) => (
            <div
              key={name}
              className="grid grid-cols-[32px_1fr_160px_160px_120px] px-4 py-2 items-center border-b hover:bg-gray-50"
            >
              <div></div>
              <button className="text-left text-blue-600 hover:underline" onClick={() => setDevice(name)}>
                {name}
              </button>
              <div>-</div>
              <div>-</div>
              <div></div>
            </div>
          ))}

        {/* B. 根目录选择 */}
        {device &&
          !root &&
          roots.map((r) => (
            <div
              key={r}
              className="grid grid-cols-[32px_1fr_160px_160px_120px] px-4 py-2 items-center border-b hover:bg-gray-50"
            >
              <div></div>
              <button className="text-left text-blue-600 hover:underline" onClick={() => setRoot(r)}>
                {r}
              </button>
              <div>-</div>
              <div>-</div>
              <div></div>
            </div>
          ))}

        {/* C. 目录 + 文件 */}
        {root &&
          items.map((row) => (
            <div
              key={row.path}
              className="grid grid-cols-[32px_1fr_160px_160px_120px] px-4 py-2 items-center border-b last:border-b-0 hover:bg-gray-50"
            >
              {/* 仅文件显示复选框 */}
              <div>
                {row.is_audio && (
                  <input type="checkbox" checked={selected.has(row.path)} onChange={() => toggle(row.path)} />
                )}
              </div>

              <div className="truncate">
                <button
                  className={`text-left ${row.is_dir ? 'text-blue-600 hover:underline' : ''}`}
                  onClick={() => openDir(row)}
                  title={row.path}
                >
                  {row.name}
                </button>
              </div>

              <div className="tabular-nums">{row.is_dir ? '-' : prettyBytes(row.size)}</div>
              <div className="tabular-nums">{formatTime(row.mtime)}</div>

              <div className="flex gap-2">
                {row.is_audio && (
                  <button className="px-2 py-1 rounded border" onClick={() => downloadOne(row)}>
                    Download
                  </button>
                )}
              </div>
            </div>
          ))}

        {root && (
          <div className="p-3 text-center text-sm text-gray-500">
            {loading ? 'Loading…' : total ? `${total} item(s)` : 'Empty'}
          </div>
        )}
      </div>
    </div>
  );
}

/* helpers */
function prettyBytes(n = 0) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}
function formatTime(ts) {
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return '-';
  }
}
