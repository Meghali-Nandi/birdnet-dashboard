import { useCallback, useEffect, useMemo, useState } from "react"
import Papa from "papaparse"

import {

  AreaChart,

  Area,

  BarChart,

  Bar,

  CartesianGrid,

  Cell,

  Pie,

  PieChart,

  ResponsiveContainer,

  Tooltip,

  XAxis,

  YAxis,

} from "recharts"

import {
  Activity,
  BarChart3,
  Bird,
  CalendarDays,
  Clock3,
  Database,
  Gauge,
  Info,
  LogIn,
  Mail,
  PawPrint,
  RefreshCw,
  Search,
  UserRound
} from "lucide-react"



const CLASS_META = {

  Bird: {

    color: "#FFD400",

    soft: "#FFF6BF",

    text: "#7A6100",

  },

  Mammal: {

    color: "#7C3AED",

    soft: "#EDE9FE",

    text: "#5B21B6",

  },

  Amphibian: {

    color: "#16A34A",

    soft: "#DCFCE7",

    text: "#166534",

  },

  Insect: {

    color: "#F97316",

    soft: "#FFEDD5",

    text: "#9A3412",

  },

  Other: {

    color: "#64748B",

    soft: "#E2E8F0",

    text: "#334155",

  },

  Unknown: {

    color: "#94A3B8",

    soft: "#F1F5F9",

    text: "#475569",

  },

}



const FREQUENCIES = ["Hourly", "6 Hours", "Daily", "Weekly"]



const DATE_RANGES = [

  "Last 24 hours",

  "Last 7 days",

  "Last 30 days",

  "All data",

]



const CONFIDENCE_OPTIONS = [

  { label: "All confidence", value: 0 },

  { label: "≥ 50%", value: 0.5 },

  { label: "≥ 60%", value: 0.6 },

  { label: "≥ 70%", value: 0.7 },

  { label: "≥ 80%", value: 0.8 },

  { label: "≥ 90%", value: 0.9 },

]



function classMeta(name) {

  return CLASS_META[name] || CLASS_META.Other

}



function getBucketStart(inputDate, frequency) {

  const d = new Date(inputDate)



  if (frequency === "Hourly") {

    d.setMinutes(0, 0, 0)

  }



  if (frequency === "6 Hours") {

    d.setHours(Math.floor(d.getHours() / 6) * 6, 0, 0, 0)

  }



  if (frequency === "Daily") {

    d.setHours(0, 0, 0, 0)

  }



  if (frequency === "Weekly") {

    const mondayOffset = (d.getDay() + 6) % 7

    d.setDate(d.getDate() - mondayOffset)

    d.setHours(0, 0, 0, 0)

  }



  return d

}



function formatBucketLabel(date, frequency) {

  if (frequency === "Hourly") {

    return date.toLocaleString([], {

      month: "short",

      day: "numeric",

      hour: "2-digit",

      minute: "2-digit",

    })

  }



  if (frequency === "6 Hours") {

    return date.toLocaleString([], {

      month: "short",

      day: "numeric",

      hour: "2-digit",

    })

  }



  if (frequency === "Daily") {

    return date.toLocaleDateString([], {

      month: "short",

      day: "numeric",

    })

  }



  return `Week of ${date.toLocaleDateString([], {

    month: "short",

    day: "numeric",

  })}`

}



function formatDateTime(value) {

  const date = value instanceof Date ? value : new Date(value)



  return date.toLocaleString([], {

    year: "numeric",

    month: "short",

    day: "numeric",

    hour: "2-digit",

    minute: "2-digit",

  })

}



function KpiCard({ icon: Icon, label, value, helper, accent = "yellow" }) {

  const accents = {

    yellow: "border-yellow-300 bg-yellow-50/30",

    blue: "border-blue-200 bg-blue-50/30",

    green: "border-emerald-200 bg-emerald-50/30",

    purple: "border-violet-200 bg-violet-50/30",

  }



  return (

    <div

      className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${

        accents[accent] || accents.yellow

      }`}

    >

      <div className="mb-5 flex items-center justify-between">

        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">

          <Icon size={17} />

          {label}

        </div>



        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">

          Live data

        </span>

      </div>



      <div className="text-4xl font-extrabold tracking-tight text-slate-900">

        {value}

      </div>



      <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">

        {helper}

      </div>

    </div>

  )

}



function EmptyState({ message }) {

  return (

    <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500">

      {message}

    </div>

  )

}



export default function PublicDashboard() {

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshToken, setRefreshToken] = useState(0)

  const [dateRange, setDateRange] = useState("Last 24 hours")
  const [frequency, setFrequency] = useState("Hourly")
  const [animalClass, setAnimalClass] = useState("All types")
  const [device, setDevice] = useState("All devices")
  const [confidence, setConfidence] = useState(0.7)
  const [search, setSearch] = useState("")

  const ADMIN_URL =
    import.meta.env.VITE_ADMIN_URL ||
    "http://localhost:5173/login"

  const handleAdminLogin = () => {
    window.location.assign(ADMIN_URL)
  }



  const loadData = useCallback(async () => {

    try {

      setLoading(true)

      setError("")



      const DATA_BASE =
        import.meta.env.VITE_BIRDNET_DATA_BASE ||
        "https://raw.githubusercontent.com/Meghali-Nandi/Birdnet-Files/main/public/data"

      const url = `${DATA_BASE}/latest_detections.csv?t=${Date.now()}`

      const response = await fetch(url, {
        cache: "no-store",
      })



      if (!response.ok) {

        throw new Error(`Could not load detection data (${response.status})`)

      }



      const csvText = await response.text()



      const parsed = Papa.parse(csvText, {

        header: true,

        skipEmptyLines: true,

        dynamicTyping: true,

      })



      const cleaned = parsed.data

        .map((row) => {

          const ts = new Date(row.ts)



          return {

            ts,

            device: String(row.device || "Unknown"),

            animalClass: String(row.class || "Unknown"),

            species: String(row.species || "Unknown"),

            confidence: Number(row.confidence || 0),

          }

        })

        .filter((row) => !Number.isNaN(row.ts.getTime()))

        .sort((a, b) => b.ts - a.ts)



      setRows(cleaned)

    } catch (err) {

      setError(err.message || "Unable to load dashboard data")

    } finally {

      setLoading(false)

    }

  }, [])



  useEffect(() => {

    loadData()

  }, [loadData, refreshToken])



  const latestTimestamp = rows.length ? rows[0].ts : null



  const devices = useMemo(() => {

    return [...new Set(rows.map((row) => row.device))].sort()

  }, [rows])



  const classes = useMemo(() => {

    return [...new Set(rows.map((row) => row.animalClass))].sort()

  }, [rows])



  const filteredRows = useMemo(() => {

    if (!rows.length) {

      return []

    }



    const referenceTime = latestTimestamp

      ? latestTimestamp.getTime()

      : Date.now()



    let cutoff = null



    if (dateRange === "Last 24 hours") {

      cutoff = referenceTime - 24 * 60 * 60 * 1000

    }



    if (dateRange === "Last 7 days") {

      cutoff = referenceTime - 7 * 24 * 60 * 60 * 1000

    }



    if (dateRange === "Last 30 days") {

      cutoff = referenceTime - 30 * 24 * 60 * 60 * 1000

    }



    const query = search.trim().toLowerCase()



    return rows.filter((row) => {

      const matchesDate =

        cutoff === null || row.ts.getTime() >= cutoff



      const matchesClass =

        animalClass === "All types" ||

        row.animalClass === animalClass



      const matchesDevice =

        device === "All devices" ||

        row.device === device



      const matchesConfidence =

        row.confidence >= confidence



      const matchesSearch =

        !query ||

        row.species.toLowerCase().includes(query) ||

        row.animalClass.toLowerCase().includes(query) ||

        row.device.toLowerCase().includes(query)



      return (

        matchesDate &&

        matchesClass &&

        matchesDevice &&

        matchesConfidence &&

        matchesSearch

      )

    })

  }, [

    rows,

    latestTimestamp,

    dateRange,

    animalClass,

    device,

    confidence,

    search,

  ])



  const summary = useMemo(() => {

    const species = new Set(

      filteredRows.map((row) => row.species)

    )



    const avg =

      filteredRows.length === 0

        ? 0

        : filteredRows.reduce(

            (sum, row) => sum + row.confidence,

            0

          ) / filteredRows.length



    const deviceCounts = {}



    filteredRows.forEach((row) => {

      deviceCounts[row.device] =

        (deviceCounts[row.device] || 0) + 1

    })



    const mostActiveDevice =

      Object.entries(deviceCounts)

        .sort((a, b) => b[1] - a[1])[0]?.[0] || "—"



    return {

      total: filteredRows.length,

      species: species.size,

      avgConfidence: avg,

      mostActiveDevice,

    }

  }, [filteredRows])



  const activityHighlights = useMemo(() => {

    if (!filteredRows.length) {

        return {

        peakHour: "—",

        topClass: "—",

        highestConfidence: 0,

        activeDevices: 0,

        highConfidenceRate: 0,

        }

    }



    const hourCounts = {}

    const classCounts = {}



    filteredRows.forEach((row) => {

        const hour = row.ts.getHours()



        hourCounts[hour] =

        (hourCounts[hour] || 0) + 1



        classCounts[row.animalClass] =

        (classCounts[row.animalClass] || 0) + 1

    })



    const peakHourNumber =

        Object.entries(hourCounts)

        .sort((a, b) => b[1] - a[1])[0]?.[0]



    const topClass =

        Object.entries(classCounts)

        .sort((a, b) => b[1] - a[1])[0]?.[0] || "—"



    const highestConfidence =
        filteredRows.reduce(
            (highest, row) =>
            Math.max(highest, row.confidence),
            0
    )



    const activeDevices =

        new Set(

        filteredRows.map(

            (row) => row.device

        )

        ).size



    const highConfidenceCount =

        filteredRows.filter(

        (row) => row.confidence >= 0.8

        ).length



    const highConfidenceRate =

        Math.round(

        (highConfidenceCount /

            filteredRows.length) *

            100

        )



    const peakHour =

        peakHourNumber !== undefined

        ? `${String(peakHourNumber).padStart(2, "0")}:00`

        : "—"



    return {

        peakHour,

        topClass,

        highestConfidence,

        activeDevices,

        highConfidenceRate,

    }

    }, [filteredRows])



  const activityData = useMemo(() => {

    const buckets = new Map()



    filteredRows.forEach((row) => {

      const bucketDate = getBucketStart(

        row.ts,

        frequency

      )



      const key = bucketDate.toISOString()



      if (!buckets.has(key)) {

        buckets.set(key, {

          key,

          bucketDate,

          total: 0,

        })

      }



      const bucket = buckets.get(key)



      bucket.total += 1

      bucket[row.animalClass] =

        (bucket[row.animalClass] || 0) + 1

    })



    return [...buckets.values()]

      .sort((a, b) => a.bucketDate - b.bucketDate)

      .map((bucket) => ({

        ...bucket,

        label: formatBucketLabel(

          bucket.bucketDate,

          frequency

        ),

      }))

  }, [filteredRows, frequency])



  const classDistribution = useMemo(() => {

    const counts = {}



    filteredRows.forEach((row) => {

      counts[row.animalClass] =

        (counts[row.animalClass] || 0) + 1

    })



    return Object.entries(counts)

      .map(([name, value]) => ({

        name,

        value,

        color: classMeta(name).color,

      }))

      .sort((a, b) => b.value - a.value)

  }, [filteredRows])



  const topSpecies = useMemo(() => {

    const counts = {}



    filteredRows.forEach((row) => {

      counts[row.species] =

        (counts[row.species] || 0) + 1

    })



    return Object.entries(counts)

      .map(([species, count]) => ({

        species,

        count,

      }))

      .sort((a, b) => b.count - a.count)

      .slice(0, 7)

  }, [filteredRows])



  const visibleClasses = useMemo(() => {

    if (animalClass !== "All types") {

      return [animalClass]

    }



    return classDistribution

      .map((item) => item.name)

      .slice(0, 5)

  }, [animalClass, classDistribution])



  const recentRows = filteredRows.slice(0, 12)



  const ageHours = latestTimestamp

    ? (Date.now() - latestTimestamp.getTime()) /

      (1000 * 60 * 60)

    : null



  const dataState =
    ageHours === null
      ? "Unavailable"
      : ageHours >= 0 && ageHours <= 24
        ? "Current"
        : ageHours < 0
          ? "Future-dated data"
          : "Check freshness"



  return (

    <div className="min-h-screen bg-[#E9EDF1] text-slate-900">

      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between bg-[#111827] px-4 text-white shadow-lg lg:px-5">

        <div className="flex min-w-0 items-center gap-3">

          <img

            src={`${import.meta.env.BASE_URL}Logo.svg`}

            alt="BowerBird"

            className="h-10 w-10 rounded-lg bg-yellow-400 object-contain p-1"

          />



          <div className="truncate text-lg font-extrabold tracking-tight lg:text-xl">

            <span className="text-[#FFD400]">

              BowerBird

            </span>

          </div>

        </div>



      <button
        type="button"
        onClick={handleAdminLogin}
        className="flex items-center gap-2 rounded-xl bg-[#FFD400] px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-yellow-300"
      >
        <LogIn size={17} />
        Admin
      </button>

      </header>



      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-56 flex-col bg-[#1F2A3A] p-2.5 text-white shadow-xl lg:flex">

        <nav className="space-y-2">

          <a

            href="#overview"

            className="flex items-center gap-3 rounded-lg bg-[#FFD400] px-4 py-3 font-bold text-slate-950"

          >

            <BarChart3 size={18} />

            Overview

          </a>



          <a

            href="#activity"

            className="flex items-center gap-3 rounded-lg px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-700"

          >

            <Activity size={18} />

            Activity

          </a>



          <a

            href="#species"

            className="flex items-center gap-3 rounded-lg px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-700"

          >

            <Bird size={18} />

            Species

          </a>



          <a

            href="#contact"

            className="flex items-center gap-3 rounded-lg px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-700"

          >

            <Info size={18} />

            Contact

          </a>

        </nav>



      </aside>



      <main className="pt-16 lg:ml-56">

        <div

            id="overview"

            className="mx-auto max-w-[1650px] scroll-mt-24 p-4 sm:p-6 lg:p-7"

        >

          <section className="mb-5 flex flex-col gap-3 rounded-xl bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">

            <div className="flex flex-wrap items-center gap-4">

              <div

                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${

                  dataState === "Current"

                    ? "bg-emerald-50 text-emerald-700"

                    : "bg-amber-50 text-amber-700"

                }`}

              >

                <span className="h-2 w-2 rounded-full bg-current" />

                {dataState}

              </div>



              {latestTimestamp && (

                <div className="text-sm text-slate-500">

                  Last updated{" "}

                  <span className="font-semibold text-slate-700">

                    {formatDateTime(latestTimestamp)}

                  </span>

                </div>

              )}



              <div className="hidden h-5 w-px bg-slate-200 md:block" />



              <div className="text-sm text-slate-500">

                Showing{" "}

                <span className="font-semibold text-slate-700">

                  {filteredRows.length.toLocaleString()}

                </span>{" "}

                detections

              </div>

            </div>



            <div className="flex flex-col gap-2 sm:flex-row">

              <div className="relative min-w-[260px]">

                <Search

                  size={17}

                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"

                />



                <input

                  value={search}

                  onChange={(event) =>

                    setSearch(event.target.value)

                  }

                  placeholder="Search species or device"

                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"

                />

              </div>



              <button

                type="button"

                onClick={() =>

                  setRefreshToken(

                    (value) => value + 1

                  )

                }

                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"

              >

                <RefreshCw size={17} />

                Refresh

              </button>

            </div>

          </section>



          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">

              <label className="space-y-1.5">

                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">

                  <CalendarDays size={14} />

                  Time period

                </span>



                <select

                  value={dateRange}

                  onChange={(event) =>

                    setDateRange(event.target.value)

                  }

                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-yellow-400"

                >

                  {DATE_RANGES.map((item) => (

                    <option key={item}>

                      {item}

                    </option>

                  ))}

                </select>

              </label>



              <label className="space-y-1.5">

                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">

                  <Clock3 size={14} />

                  Frequency

                </span>



                <select

                  value={frequency}

                  onChange={(event) =>

                    setFrequency(event.target.value)

                  }

                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-yellow-400"

                >

                  {FREQUENCIES.map((item) => (

                    <option key={item}>

                      {item}

                    </option>

                  ))}

                </select>

              </label>



              <label className="space-y-1.5">

                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">

                  <PawPrint size={14} />

                  Detection type

                </span>



                <select

                  value={animalClass}

                  onChange={(event) =>

                    setAnimalClass(event.target.value)

                  }

                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-yellow-400"

                >

                  <option>All types</option>



                  {classes.map((item) => (

                    <option key={item}>

                      {item}

                    </option>

                  ))}

                </select>

              </label>



              <label className="space-y-1.5">

                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">

                  <Database size={14} />

                  Device

                </span>



                <select

                  value={device}

                  onChange={(event) =>

                    setDevice(event.target.value)

                  }

                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-yellow-400"

                >

                  <option>All devices</option>



                  {devices.map((item) => (

                    <option key={item}>

                      {item}

                    </option>

                  ))}

                </select>

              </label>



              <label className="space-y-1.5">

                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">

                  <Gauge size={14} />

                  Confidence

                </span>



                <select

                  value={confidence}

                  onChange={(event) =>

                    setConfidence(

                      Number(event.target.value)

                    )

                  }

                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-yellow-400"

                >

                  {CONFIDENCE_OPTIONS.map((item) => (

                    <option

                      key={item.label}

                      value={item.value}

                    >

                      {item.label}

                    </option>

                  ))}

                </select>

              </label>

            </div>

          </section>



          {error && (

            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">

              {error}

            </div>

          )}



          {loading ? (

            <div className="rounded-2xl bg-white p-12 text-center text-sm text-slate-500 shadow-sm">

              Loading BowerBird data...

            </div>

          ) : (

            <>

              <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <KpiCard

                  icon={Activity}

                  label="Detections"

                  value={summary.total.toLocaleString()}

                  helper="Matches the current filters"

                  accent="yellow"

                />



                <KpiCard

                  icon={Bird}

                  label="Species"

                  value={summary.species.toLocaleString()}

                  helper="Unique detected species"

                  accent="blue"

                />



                <KpiCard

                  icon={Gauge}

                  label="Average Confidence"

                  value={

                    summary.total

                      ? `${Math.round(

                          summary.avgConfidence * 100

                        )}%`

                      : "—"

                  }

                  helper="Average model confidence"

                  accent="green"

                />



                <KpiCard

                  icon={Database}

                  label="Most Active Node"

                  value={summary.mostActiveDevice}

                  helper="Highest detection count"

                  accent="purple"

                />

              </section>



              <section

                id="activity"

                className="mb-5 scroll-mt-24 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.85fr)]"

                >

                <div className="rounded-2xl bg-white p-5 shadow-sm">

                  <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <h2 className="text-lg font-extrabold text-slate-900">

                        Detection Activity

                      </h2>



                      <p className="text-sm text-slate-500">

                        {frequency} activity across

                        the selected period

                      </p>

                    </div>



                    <span className="text-xs font-semibold text-slate-400">

                      {filteredRows.length.toLocaleString()} detections

                    </span>

                  </div>



                  {activityData.length ? (

                    <div className="h-[360px]">

                      <ResponsiveContainer

                        width="100%"

                        height="100%"

                      >

                        <AreaChart

                          data={activityData}

                          margin={{

                            top: 10,

                            right: 10,

                            left: -18,

                            bottom: 10,

                          }}

                        >

                          <defs>

                            {visibleClasses.map(

                              (name) => (

                                <linearGradient

                                  id={`gradient-${name.replace(

                                    /\s+/g,

                                    "-"

                                  )}`}

                                  key={name}

                                  x1="0"

                                  y1="0"

                                  x2="0"

                                  y2="1"

                                >

                                  <stop

                                    offset="5%"

                                    stopColor={

                                      classMeta(name)

                                        .color

                                    }

                                    stopOpacity={0.35}

                                  />

                                  <stop

                                    offset="95%"

                                    stopColor={

                                      classMeta(name)

                                        .color

                                    }

                                    stopOpacity={0.04}

                                  />

                                </linearGradient>

                              )

                            )}

                          </defs>



                          <CartesianGrid

                            strokeDasharray="3 3"

                            vertical={false}

                            stroke="#E2E8F0"

                          />



                          <XAxis

                            dataKey="label"

                            tick={{

                              fontSize: 11,

                              fill: "#64748B",

                            }}

                            tickLine={false}

                            axisLine={false}

                            minTickGap={28}

                          />



                          <YAxis

                            allowDecimals={false}

                            tick={{

                              fontSize: 11,

                              fill: "#64748B",

                            }}

                            tickLine={false}

                            axisLine={false}

                          />



                          <Tooltip

                            contentStyle={{

                              borderRadius: 12,

                              border:

                                "1px solid #E2E8F0",

                              boxShadow:

                                "0 12px 28px rgba(15, 23, 42, 0.12)",

                            }}

                          />



                          {visibleClasses.map(

                            (name) => (

                              <Area

                                key={name}

                                type="monotone"

                                dataKey={name}

                                stackId="1"

                                stroke={

                                  classMeta(name)

                                    .color

                                }

                                fill={`url(#gradient-${name.replace(

                                  /\s+/g,

                                  "-"

                                )})`}

                                strokeWidth={2}

                                activeDot={{

                                  r: 4,

                                }}

                              />

                            )

                          )}

                        </AreaChart>

                      </ResponsiveContainer>

                    </div>

                  ) : (

                    <EmptyState message="No detections match the current filters." />

                  )}

                </div>



                <div className="rounded-2xl bg-white p-5 shadow-sm">

                  <div className="mb-4">

                    <h2 className="text-lg font-extrabold text-slate-900">

                      Animal Classes

                    </h2>



                    <p className="text-sm text-slate-500">

                      Distribution of detected

                      wildlife

                    </p>

                  </div>



                  {classDistribution.length ? (

                    <>

                      <div className="h-[220px]">

                        <ResponsiveContainer

                          width="100%"

                          height="100%"

                        >

                          <PieChart>

                            <Pie

                              data={

                                classDistribution

                              }

                              dataKey="value"

                              nameKey="name"

                              innerRadius={62}

                              outerRadius={88}

                              paddingAngle={3}

                            >

                              {classDistribution.map(

                                (entry) => (

                                  <Cell

                                    key={

                                      entry.name

                                    }

                                    fill={

                                      entry.color

                                    }

                                  />

                                )

                              )}

                            </Pie>



                            <Tooltip />

                          </PieChart>

                        </ResponsiveContainer>

                      </div>



                      <div className="space-y-3">

                        {classDistribution.map(

                          (item) => {

                            const percentage =

                              filteredRows.length >

                              0

                                ? Math.round(

                                    (item.value /

                                      filteredRows.length) *

                                      100

                                  )

                                : 0



                            return (

                              <div

                                key={item.name}

                                className="flex items-center justify-between gap-3 text-sm"

                              >

                                <div className="flex items-center gap-2">

                                  <span

                                    className="h-2.5 w-2.5 rounded-full"

                                    style={{

                                      backgroundColor:

                                        item.color,

                                    }}

                                  />



                                  <span className="font-semibold text-slate-700">

                                    {item.name}

                                  </span>

                                </div>



                                <div className="text-right">

                                  <span className="font-bold text-slate-900">

                                    {item.value}

                                  </span>



                                  <span className="ml-2 text-xs text-slate-400">

                                    {percentage}%

                                  </span>

                                </div>

                              </div>

                            )

                          }

                        )}

                      </div>

                    </>

                  ) : (

                    <EmptyState message="No class data available." />

                  )}

                </div>

              </section>



              <section

                id="species"

                className="mb-5 scroll-mt-24 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]"

                >

                <div className="rounded-2xl bg-white p-5 shadow-sm">

                  <div className="mb-4">

                    <h2 className="text-lg font-extrabold text-slate-900">

                      Most Detected Species

                    </h2>



                    <p className="text-sm text-slate-500">

                      Top species for the current

                      filters

                    </p>

                  </div>



                  {topSpecies.length ? (

                    <div className="h-[340px]">

                      <ResponsiveContainer

                        width="100%"

                        height="100%"

                      >

                        <BarChart

                          data={topSpecies}

                          layout="vertical"

                          margin={{

                            top: 5,

                            right: 20,

                            left: 25,

                            bottom: 5,

                          }}

                        >

                          <CartesianGrid

                            strokeDasharray="3 3"

                            horizontal={false}

                            stroke="#E2E8F0"

                          />



                          <XAxis

                            type="number"

                            allowDecimals={false}

                            tick={{

                              fontSize: 11,

                              fill: "#64748B",

                            }}

                            tickLine={false}

                            axisLine={false}

                          />



                          <YAxis

                            type="category"

                            dataKey="species"

                            width={155}

                            tick={{

                              fontSize: 11,

                              fill: "#475569",

                            }}

                            tickLine={false}

                            axisLine={false}

                          />



                          <Tooltip

                            cursor={{

                              fill: "#F8FAFC",

                            }}

                            contentStyle={{

                              borderRadius: 12,

                              border:

                                "1px solid #E2E8F0",

                            }}

                          />



                          <Bar

                            dataKey="count"

                            fill="#FFD400"

                            radius={[

                              0,

                              8,

                              8,

                              0,

                            ]}

                          />

                        </BarChart>

                      </ResponsiveContainer>

                    </div>

                  ) : (

                    <EmptyState message="No species data available." />

                  )}

                </div>



                <div className="rounded-2xl bg-white p-5 shadow-sm">

                    <div className="mb-5">

                        <h2 className="text-lg font-extrabold text-slate-900">

                        Activity Highlights

                        </h2>



                        <p className="text-sm text-slate-500">

                        Key observations for the selected period

                        </p>

                    </div>



                    <div className="grid grid-cols-2 gap-3">



                        <div className="rounded-xl bg-slate-50 p-4">

                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">

                            Peak activity

                        </div>



                        <div className="mt-2 text-2xl font-extrabold text-slate-900">

                            {activityHighlights.peakHour}

                        </div>

                        </div>



                        <div className="rounded-xl bg-slate-50 p-4">

                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">

                            Most common class

                        </div>



                        <div className="mt-2 text-2xl font-extrabold text-slate-900">

                            {activityHighlights.topClass}

                        </div>

                        </div>



                        <div className="rounded-xl bg-slate-50 p-4">

                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">

                            Highest confidence

                        </div>



                        <div className="mt-2 text-2xl font-extrabold text-slate-900">

                            {Math.round(

                            activityHighlights.highestConfidence *

                                100

                            )}

                            %

                        </div>

                        </div>



                        <div className="rounded-xl bg-slate-50 p-4">

                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">

                            Active nodes

                        </div>



                        <div className="mt-2 text-2xl font-extrabold text-slate-900">

                            {activityHighlights.activeDevices}

                        </div>

                        </div>



                    </div>



                    <div className="mt-5 rounded-xl bg-slate-50 p-4">



                        <div className="mb-3 flex items-center justify-between">



                        <div>

                            <div className="text-sm font-bold text-slate-800">

                            High-confidence detections

                            </div>



                            <div className="text-xs text-slate-500">

                            Confidence of 80% or higher

                            </div>

                        </div>



                        <span className="text-lg font-extrabold text-slate-900">

                            {activityHighlights.highConfidenceRate}%

                        </span>



                        </div>



                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">



                        <div

                            className="h-full rounded-full bg-[#FFD400] transition-all"

                            style={{

                            width: `${activityHighlights.highConfidenceRate}%`,

                            }}

                        />



                        </div>



                    </div>

                    </div>

              </section>



              <section className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm">

                <div className="flex flex-col gap-1 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <h2 className="text-lg font-extrabold text-slate-900">

                      Latest Detections

                    </h2>



                    <p className="text-sm text-slate-500">

                      Most recent observations

                      matching your filters

                    </p>

                  </div>



                  <span className="text-xs font-semibold text-slate-400">

                    Showing {recentRows.length} records

                  </span>

                </div>



                <div className="overflow-x-auto">

                  <table className="min-w-full">

                    <thead className="bg-slate-50">

                      <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">

                        <th className="px-5 py-3">

                          Time

                        </th>

                        <th className="px-5 py-3">

                          Type

                        </th>

                        <th className="px-5 py-3">

                          Species

                        </th>

                        <th className="px-5 py-3">

                          Device

                        </th>

                        <th className="px-5 py-3">

                          Confidence

                        </th>

                      </tr>

                    </thead>



                    <tbody className="divide-y divide-slate-100">

                      {recentRows.length ? (

                        recentRows.map(

                          (row, index) => {

                            const meta =

                              classMeta(

                                row.animalClass

                              )



                            return (

                              <tr

                                key={`${row.ts.toISOString()}-${row.device}-${row.species}-${index}`}

                                className="transition hover:bg-slate-50"

                              >

                                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">

                                  {formatDateTime(

                                    row.ts

                                  )}

                                </td>



                                <td className="px-5 py-4">

                                  <span

                                    className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold"

                                    style={{

                                      backgroundColor:

                                        meta.soft,

                                      color:

                                        meta.text,

                                    }}

                                  >

                                    {

                                      row.animalClass

                                    }

                                  </span>

                                </td>



                                <td className="px-5 py-4 text-sm font-semibold text-slate-900">

                                  {row.species}

                                </td>



                                <td className="px-5 py-4 text-sm text-slate-600">

                                  {row.device}

                                </td>



                                <td className="px-5 py-4">

                                  <div className="flex items-center gap-2">

                                    <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">

                                      <div

                                        className="h-full rounded-full bg-emerald-500"

                                        style={{

                                          width: `${Math.min(

                                            100,

                                            Math.max(

                                              0,

                                              row.confidence *

                                                100

                                            )

                                          )}%`,

                                        }}

                                      />

                                    </div>



                                    <span className="text-sm font-bold text-slate-700">

                                      {Math.round(

                                        row.confidence *

                                          100

                                      )}

                                      %

                                    </span>

                                  </div>

                                </td>

                              </tr>

                            )

                          }

                        )

                      ) : (

                        <tr>

                          <td

                            colSpan="5"

                            className="px-5 py-12 text-center text-sm text-slate-500"

                          >

                            No detections match the

                            current filters.

                          </td>

                        </tr>

                      )}

                    </tbody>

                  </table>

                </div>

              </section>



              <section

                id="contact"

                className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"

                >

                <div className="mb-5">

                    <h2 className="text-lg font-extrabold text-slate-900">

                    Contact

                    </h2>



                    <p className="mt-1 text-sm text-slate-500">

                    For questions about the project, data, or dashboard, contact the research team.

                    </p>

                </div>



                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">



                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-yellow-100 text-yellow-800">

                        <UserRound size={20} />

                    </div>



                    <h3 className="font-bold text-slate-900">

                        Person One

                    </h3>



                    <p className="mt-1 text-sm text-slate-500">

                        Project Lead

                    </p>



                    <p className="mt-1 text-sm text-slate-500">

                        UNSW

                    </p>



                    <a

                        href="mailto:person1@unsw.edu.au"

                        className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"

                        >

                        <Mail size={15} />

                        person1@unsw.edu.au

                    </a>

                    </div>



                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-yellow-100 text-yellow-800">

                        <UserRound size={20} />

                    </div>



                    <h3 className="font-bold text-slate-900">

                        Person Two

                    </h3>



                    <p className="mt-1 text-sm text-slate-500">

                        Researcher

                    </p>



                    <p className="mt-1 text-sm text-slate-500">

                        UNSW

                    </p>



                    <a

                        href="mailto:person1@unsw.edu.au"

                        className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"

                        >

                        <Mail size={15} />

                        person2@unsw.edu.au

                    </a>

                    </div>



                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-yellow-100 text-yellow-800">

                        <UserRound size={20} />

                    </div>



                    <h3 className="font-bold text-slate-900">

                        Person Three

                    </h3>



                    <p className="mt-1 text-sm text-slate-500">

                        Technical Contact

                    </p>



                    <p className="mt-1 text-sm text-slate-500">

                        UNSW

                    </p>



                    <a

                        href="mailto:person1@unsw.edu.au"

                        className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"

                        >

                        <Mail size={15} />

                        person3@unsw.edu.au

                    </a>

                    </div>



                </div>

                </section>

            </>

          )}

        </div>

      </main>

    </div>

  )

}
