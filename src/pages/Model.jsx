// src/pages/Models.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiUpload2Line,
  RiSearchLine,
  RiRefreshLine,
  RiDownloadCloud2Line,
  RiCheckboxCircleFill,
  RiAlertLine,
  RiCloseLine,
  RiCpuLine,
  RiTimerFlashLine,
  RiCheckboxBlankCircleFill,
} from 'react-icons/ri';
import axiosInstance from '../api';
import axios from 'axios';

const BRAND = '#FEDC00';
const PI_AGENT_PORT = 5000;

const COLS = 'grid grid-cols-[1.4fr_0.8fr_1.6fr]';

/* ---------------- helpers ---------------- */
const authHeader = () => {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};
const prettyBytes = (n) => {
  if (!Number.isFinite(n)) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0,
    v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${u[i]}`;
};
const fromUnix = (t) => (t ? new Date(t * 1000).toLocaleString() : '—');

/** 硬编码的设备清单（你给的五台） */
const HARD_DEVICES = [
  { id: '1', hostname: '1-birdnetpi-b816', ip: '100.81.225.62', online: false },
  { id: '2', hostname: '2-birdnetpi-b687', ip: '100.86.47.35', online: true },
  { id: '3', hostname: '3-birdnetpi-b864', ip: '100.117.46.111', online: true },
  { id: '4', hostname: '4-birdnetpi-b519', ip: '100.111.96.87', online: false },
  { id: '5', hostname: '5-birdnetpi-b927', ip: '100.93.6.61', online: false },
];

/* ---------------- main ---------------- */
export default function Models() {
  // 左侧模型
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('mtime'); // mtime | name | size
  const [uploadOpen, setUploadOpen] = useState(false);
  const [downloadingStem, setDownloadingStem] = useState(null);

  // 右侧设备（三列：hostname/status/current model）
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  /** 加载模型（中心服务器） */
  const loadModels = async () => {
    try {
      setLoadingModels(true);
      const { data } = await axiosInstance.get('model', { headers: authHeader() });
      if (data?.ok) setModels(data.items || []);
    } finally {
      setLoadingModels(false);
    }
  };

  /** 探测单台 Pi 的当前模型（设备侧本地 Flask） */
  const probePi = async (dev) => {
    const base = `http://${dev.ip}:${PI_AGENT_PORT}`;
    // 你设备侧若有 X-Auth-Token，就从 localStorage 取出拼进 header
    const xauth = localStorage.getItem('pi_x_auth_token') || '';
    try {
      const { data } = await axios.get(`${base}/api/pi/info`, {
        timeout: 3500,
      });
      // 兼容不同返回：/api/pi/info 或 /api/local_summary 这种
      const model =
        data?.MODEL || data?.config?.MODEL || data?.model || data?.current_model || data?.current_model_name || '—';
      console.log(`Probed ${dev.hostname} (${dev.ip}): model=${model}`);
      return { online: true, current_model_name: model };
    } catch {
      return { online: false, current_model_name: '—' };
    }
  };

  /** 加载设备：先放入硬编码列表，再并发探测当前模型和在线状态 */
  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      // 先渲染基本列表
      setDevices(
        HARD_DEVICES.map((d) => ({
          ...d,
          current_model_name: '—',
          probing: true,
        }))
      );

      // 并发探测
      const results = await Promise.allSettled(HARD_DEVICES.map((d) => probePi(d)));

      const merged = HARD_DEVICES.map((d, i) => {
        const r = results[i];
        if (r.status === 'fulfilled') {
          return {
            ...d,
            online: r.value.online,
            current_model_name: r.value.current_model_name,
            probing: false,
          };
        }
        return { ...d, probing: false };
      });

      // 在线优先显示
      // merged.sort((a, b) => Number(b.online) - Number(a.online) || a.hostname.localeCompare(b.hostname));
      setDevices(merged);
    } finally {
      setLoadingDevices(false);
    }
  };

  // 放在组件里（替换你现有的 handleSwitchModel）
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const handleSwitchModel = async (dev, modelName) => {
    if (!modelName) return;

    const base = `http://${dev.ip}:${PI_AGENT_PORT}`;
    const xauth = localStorage.getItem('pi_x_auth_token') || '';

    // 切换中 → UI 提示
    setDevices((prev) => prev.map((d) => (d.id === dev.id ? { ...d, switching: true } : d)));

    // 一个小工具：用 /api/model/status 里的 models 判断是否已有
    const deviceHasModel = (statusJson, target) => {
      const list = Array.isArray(statusJson?.models) ? statusJson.models : [];
      // 模型项可能长这样：
      // { stem, model_filename, labels_filename, size, mtime }
      return list.some(
        (m) =>
          m?.stem === target ||
          m?.model_filename === `${target}.tflite` ||
          // 有些实现返回简单字符串数组时也兼容
          (typeof m === 'string' && (m === target || m === `${target}.tflite`))
      );
    };

    try {
      // 1) 查状态（拿当前 models 列表）
      const { data: status } = await axios.get(`${base}/api/model/status`, {
        headers: { 'X-Auth-Token': xauth },
        timeout: 4000,
      });

      const hasModel = deviceHasModel(status, modelName);
      console.log(`[${dev.hostname}] hasModel=${hasModel}`, status);

      if (hasModel) {
        // 2-A) 设备已有 → 直接切换
        await axios.post(
          `${base}/api/model/switch`,
          { stem: modelName },
          { headers: { 'X-Auth-Token': xauth }, timeout: 15000 }
        );
      } else {
        // 2-B) 设备没有 → 让中心后端去“拉仓库→推到Pi→切换”
        //    后端路由见上一条消息里的 /api/edge/switch
        const { data } = await axiosInstance.post(
          'edge/switch',
          { device_id: dev.id, stem: modelName },
          { headers: authHeader() }
        );
        if (!data?.ok) throw new Error(data?.error || 'edge switch failed');
      }

      // 3) 轮询确认（Pi 切完可能要几秒）
      let finalModel = modelName;
      for (let i = 0; i < 6; i++) {
        await sleep(1000);
        try {
          const { data: s2 } = await axios.get(`${base}/api/model/status`, {
            headers: { 'X-Auth-Token': xauth },
            timeout: 4000,
          });
          const cur =
            s2?.current_model ||
            s2?.current_model_name ||
            s2?.currentModel ||
            (s2?.config || {}).MODEL ||
            s2?.current_model_stem ||
            null;

          if (cur) finalModel = cur;
          if (finalModel === modelName) break; // 已生效
        } catch (_) {
          // 忽略瞬时错误，继续轮询
        }
      }

      // 4) 更新 UI
      setDevices((prev) =>
        prev.map((d) => (d.id === dev.id ? { ...d, current_model_name: finalModel, switching: false } : d))
      );
    } catch (err) {
      console.error(err);
      alert(`Failed to switch model on ${dev.hostname}: ${err.response?.data?.error || err.message}`);
      setDevices((prev) => prev.map((d) => (d.id === dev.id ? { ...d, switching: false } : d)));
    }
  };

  useEffect(() => {
    loadModels();
    loadDevices();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? models.filter((m) => `${m.name} ${m.model_filename}`.toLowerCase().includes(q)) : models.slice();
    const key = sortBy === 'name' ? (x) => x.name.toLowerCase() : sortBy === 'size' ? (x) => x.size : (x) => x.mtime; // 默认时间倒序
    base.sort((a, b) => (key(a) < key(b) ? 1 : -1));
    return base;
  }, [models, query, sortBy]);

  const downloadBundle = async (stem) => {
    setDownloadingStem(stem);
    try {
      const res = await axiosInstance.get(`model/download/${encodeURIComponent(stem)}`, {
        headers: authHeader(),
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stem}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Download failed: ${e?.response?.data?.error || e.message}`);
    } finally {
      setDownloadingStem(null);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-[calc(100vh-90px)]">
      {/* LEFT — Model repository (Light) */}
      <section className="col-span-1 min-w-0 rounded-2xl border border-gray-200 bg-white flex flex-col shadow-sm">
        {/* header */}
        <div className="p-4 border-b border-gray-200 rounded-t-2xl bg-white">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Model repository</h2>

            <div className="flex items-center gap-2">
              {/* 刷新 */}
              <button
                onClick={loadModels}
                title="Refresh"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                <RiRefreshLine className="w-5 h-5" />
              </button>

              {/* 上传 */}
              <button
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium shadow-sm hover:shadow transition border border-yellow-400"
                style={{ backgroundColor: BRAND }}
              >
                <RiUpload2Line className="w-5 h-5 mr-1 -mt-[1px]" />
                Upload
              </button>
            </div>
          </div>

          {/* 工具条：搜索 + 排序 */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-yellow-300">
              <RiSearchLine className="w-4 h-4 text-gray-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search models…"
                className="w-full bg-transparent outline-none text-sm placeholder:text-gray-400"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 focus:ring-2 focus:ring-yellow-300"
            >
              <option value="mtime">Newest</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </div>
        </div>

        {/* list — 独立滚动 */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 rounded-b-2xl">
          <AnimatePresence initial={false}>
            {loadingModels ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-500">
                Loading models…
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 rounded-2xl border border-dashed border-gray-300 bg-white text-center"
              >
                <div className="text-base font-medium mb-1">No models found</div>
                <div className="text-sm text-gray-500">Click “Upload” to add a new model pair.</div>
              </motion.div>
            ) : (
              <motion.div layout className="grid grid-cols-1 gap-3">
                {filtered.map((m) => (
                  <ModelCard
                    key={m.id || m.name}
                    model={m}
                    busy={downloadingStem === (m.id || m.name)}
                    onDownload={() => downloadBundle(m.name)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* RIGHT — Devices (light, 3 columns) */}
      <section className="col-span-2 min-w-0 rounded-2xl border border-gray-200 bg-white flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 rounded-t-2xl bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Devices</h2>
            <button
              onClick={loadDevices}
              className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm hover:bg-gray-50"
              title="Refresh"
            >
              <RiRefreshLine className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-b-2xl">
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            {/* header row */}
            <div className={`${COLS} text-xs uppercase tracking-wide text-gray-500 bg-gray-100 px-4 py-2`}>
              <div>Hostname</div>
              <div>Status</div>
              <div>Current Model</div>
            </div>

            {loadingDevices ? (
              <div className="p-4 text-sm text-gray-500">Loading devices…</div>
            ) : devices.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                No devices yet. When ready, we'll show hostname, online status, and the model running on each Pi.
              </div>
            ) : (
              devices.map((d, idx) => (
                <div
                  key={d.id}
                  className={`${COLS} items-center px-4 h-12 border-t border-gray-200 transition ${
                    d.switching ? 'bg-yellow-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* col 1: Hostname */}
                  <div className="font-medium text-gray-800 truncate">{d.hostname}</div>

                  {/* col 2: Status */}
                  <div className="flex items-center">
                    <StatusPill online={d.online} probing={d.probing || d.switching} />
                  </div>

                  {/* col 3: Current Model + Dropdown（见第3步） */}
                  <DeviceModelCell dev={d} models={models} onSwitch={handleSwitchModel} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Upload dialog — Light */}
      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          setUploadOpen(false);
          loadModels();
        }}
      />
    </div>
  );
}

/* ---------------- small pieces ---------------- */
function StatusPill({ online, probing }) {
  const base = 'inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors duration-150';
  if (probing) {
    return (
      <span className={`${base} border-amber-200 bg-amber-50 text-amber-700`}>
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
        Checking…
      </span>
    );
  }
  return (
    <span
      className={`${base} ${
        online ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-600'
      }`}
    >
      <RiCheckboxBlankCircleFill className={`w-2.5 h-2.5 ${online ? 'text-green-500' : 'text-gray-400'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

function ModelCard({ model, busy, onDownload }) {
  const hasLabels = !!model.labels_filename;
  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="group rounded-2xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-base font-semibold tracking-tight truncate">{model.name}</div>
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <RiTimerFlashLine className="w-3.5 h-3.5" />
              <span>Updated: {fromUnix(model.mtime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <RiCpuLine className="w-3.5 h-3.5" />
              <span>Size: {prettyBytes(model.size)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasLabels ? (
                <>
                  <RiCheckboxCircleFill className="w-3.5 h-3.5 text-green-600" />
                  <span className="truncate">Labels: {model.labels_filename}</span>
                </>
              ) : (
                <>
                  <RiAlertLine className="w-3.5 h-3.5 text-yellow-500" />
                  <span>No corresponding labels file found</span>
                </>
              )}
            </div>
          </div>
        </div>

        <span className="text-[11px] rounded-full border border-gray-300 px-2 py-0.5 bg-gray-50 text-gray-600">
          .tflite
        </span>
      </div>

      <div className="mt-3 flex items-center justify-end">
        <button
          onClick={onDownload}
          disabled={busy}
          className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-sm transition ${
            busy ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-yellow-400 hover:bg-yellow-50'
          }`}
          style={!busy ? { backgroundColor: '#FFFBE6' } : {}}
        >
          <RiDownloadCloud2Line className="w-4 h-4 mr-1 -mt-[1px]" />
          {busy ? 'Bundling…' : 'Download bundle'}
        </button>
      </div>
    </motion.div>
  );
}

/* ---------------- Upload dialog (light) ---------------- */
function UploadDialog({ open, onClose, onUploaded }) {
  const [modelFile, setModelFile] = useState(null);
  const [labelFile, setLabelFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputModel = useRef(null);
  const inputLabel = useRef(null);

  useEffect(() => {
    if (!open) {
      setModelFile(null);
      setLabelFile(null);
      setSubmitting(false);
    }
  }, [open]);

  const expectedLabelName = modelFile ? `${modelFile.name.replace(/\.tflite$/i, '')}_Labels.txt` : null;
  const validPair = modelFile && labelFile && labelFile.name === expectedLabelName;

  const submit = async (e) => {
    e.preventDefault();
    if (!validPair) return alert('Please select matching *.tflite + *_Labels.txt');
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('model', modelFile);
      fd.append('labels', labelFile);
      await axiosInstance.post('model', fd, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
      });
      onUploaded?.();
    } catch (e2) {
      alert(e2?.response?.data?.error || e2.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="relative w-[620px] max-w-[92vw] rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-lg">Upload Model</div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <RiCloseLine className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Model file */}
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
              <div className="text-sm text-gray-700 mb-2">Model (.tflite)</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => inputModel.current?.click()}
                  className="px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                >
                  Choose file
                </button>
                <input
                  ref={inputModel}
                  type="file"
                  accept=".tflite"
                  className="hidden"
                  onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                />
                <div className="text-sm text-gray-600 truncate">{modelFile ? modelFile.name : 'No file selected'}</div>
              </div>
            </div>

            {/* Labels file */}
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
              <div className="text-sm text-gray-700 mb-2">Labels (*_Labels.txt)</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => inputLabel.current?.click()}
                  className="px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                >
                  Choose file
                </button>
                <input
                  ref={inputLabel}
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={(e) => setLabelFile(e.target.files?.[0] || null)}
                />
                <div className="text-sm text-gray-600 truncate">{labelFile ? labelFile.name : 'No file selected'}</div>
              </div>
            </div>
          </div>

          {/* 校验状态 */}
          <div className="text-xs">
            {modelFile && labelFile ? (
              validPair ? (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <RiCheckboxCircleFill /> Pair looks good.
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-yellow-600">
                  <RiAlertLine />
                  Labels must be named <code className="bg-yellow-50 px-1 rounded">{expectedLabelName}</code>
                </span>
              )
            ) : (
              <span className="text-gray-500">Both files are required.</span>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={!validPair || submitting}
              className={`px-4 py-2 rounded-xl border text-sm font-medium shadow-sm ${
                !validPair || submitting
                  ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-yellow-400 hover:shadow'
              }`}
              style={!validPair || submitting ? {} : { backgroundColor: BRAND }}
            >
              <RiUpload2Line className="w-4 h-4 inline-block mr-1 -mt-[1px]" />
              {submitting ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function DeviceModelCell({ dev, models, onSwitch }) {
  const disabled = !dev.online || dev.switching || dev.probing;

  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      {/* 左侧当前模型名：单行省略，避免把列撑开 */}
      <span className="text-sm text-gray-700 truncate">
        {dev.probing ? (
          <span className="inline-flex items-center gap-2 text-gray-500">
            <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-gray-400" />
            Probing…
          </span>
        ) : dev.switching ? (
          <span className="inline-flex items-center gap-2 text-amber-600">
            <span className="animate-spin inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" />
            Switching…
          </span>
        ) : (
          dev.current_model_name || '—'
        )}
      </span>

      {/* 右侧下拉：固定宽度，永远占位；仅在不可用时禁用 */}
      <select
        className={`shrink-0 w-44 border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white hover:bg-gray-50
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onChange={(e) => onSwitch(dev, e.target.value)}
        defaultValue=""
        disabled={disabled}
      >
        <option value="" disabled>
          Switch model…
        </option>
        {models.map((m) => (
          <option key={m.name} value={m.name}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
