import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { HIJRI_MONTH_NAMES, mabimsHijriApi } from '../services/islamicApi';
import {
  MabimsConvertResponse,
  MabimsEventItem,
  MabimsMonthItem,
  MabimsSourceType,
  MabimsTodayResponse,
  MabimsYearResponse,
} from '../types/islamic';

interface HijriCalendarViewProps {
  onShowToast: (msg: string) => void;
}

type SubViewMode = 'monthly' | 'converter' | 'yearly' | 'events';

const WEEKDAYS_ID = [
  'Ahad',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

function renderSourceBadge(source: MabimsSourceType) {
  const isOfficialTable = source === 'mabims';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-[11px] font-bold ${
        isOfficialTable
          ? 'border-[#035328] bg-[#035328] text-white'
          : 'border-[#FBC647] bg-[#F7F8F5] text-[#24352B]'
      }`}
      title={
        isOfficialTable
          ? 'Data sesuai Tabel Kalender Hijriah Indonesia (Kemenag RI / MABIMS)'
          : 'Hasil Perhitungan Hisab Neo-MABIMS (Prediksi Astronomis — Menunggu Sidang Isbat Pemerintah)'
      }
    >
      {isOfficialTable ? (
        <>
          <ShieldCheck className="h-3 w-3 text-[#FBC647]" />
          <span>Tabel Resmi MABIMS / Kemenag RI</span>
        </>
      ) : (
        <>
          <Info className="h-3 w-3 text-[#035328]" />
          <span>Kalkulasi Hisab Neo-MABIMS (Prediksi)</span>
        </>
      )}
    </span>
  );
}

export const HijriCalendarView: React.FC<HijriCalendarViewProps> = ({
  onShowToast,
}) => {
  const [subView, setSubView] = useState<SubViewMode>('monthly');

  // Today state
  const [todayData, setTodayData] = useState<MabimsTodayResponse | null>(null);
  const [isLoadingToday, setIsLoadingToday] = useState<boolean>(true);

  // Selected Hijri Month & Year for Monthly/Yearly/Events
  const [selectedHijriYear, setSelectedHijriYear] = useState<number>(1447);
  const [selectedHijriMonth, setSelectedHijriMonth] = useState<number>(9);

  // Monthly data
  const [monthItems, setMonthItems] = useState<MabimsMonthItem[]>([]);
  const [isLoadingMonth, setIsLoadingMonth] = useState<boolean>(true);
  const [monthError, setMonthError] = useState<string | null>(null);

  // Yearly data
  const [yearData, setYearData] = useState<MabimsYearResponse | null>(null);
  const [isLoadingYear, setIsLoadingYear] = useState<boolean>(false);

  // Events (Islamic Holidays)
  const [eventsList, setEventsList] = useState<MabimsEventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);

  // Converter State
  const [convDirection, setConvDirection] = useState<'g2h' | 'h2g'>('g2h');
  const [convInputDate, setConvInputDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [convResult, setConvResult] = useState<MabimsConvertResponse | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [convError, setConvError] = useState<string | null>(null);

  // 1. Load Today's Hijri Date on mount
  useEffect(() => {
    let mounted = true;
    const initToday = async () => {
      setIsLoadingToday(true);
      try {
        const today = await mabimsHijriApi.getToday('Asia/Jakarta');
        if (!mounted) return;
        setTodayData(today);
        if (today.output?.year && today.output?.month) {
          setSelectedHijriYear(today.output.year);
          setSelectedHijriMonth(today.output.month);
        }
      } catch {
        // Keep defaults (1447 H) if offline
      } finally {
        if (mounted) setIsLoadingToday(false);
      }
    };
    initToday();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Load Monthly Calendar & Events whenever year/month changes
  const loadMonthlyAndEvents = useCallback(
    async (forceRefresh = false) => {
      setIsLoadingMonth(true);
      setMonthError(null);
      try {
        const [monthRes, eventsRes] = await Promise.all([
          mabimsHijriApi.getMonthCalendar(
            selectedHijriYear,
            selectedHijriMonth,
            forceRefresh
          ),
          mabimsHijriApi.getEvents(selectedHijriYear, forceRefresh),
        ]);
        setMonthItems(monthRes.items || []);
        setEventsList(eventsRes.events || []);
      } catch (err) {
        setMonthError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat kalender Hijriah dari server MABIMS.dev.'
        );
      } finally {
        setIsLoadingMonth(false);
      }
    },
    [selectedHijriYear, selectedHijriMonth]
  );

  useEffect(() => {
    loadMonthlyAndEvents(false);
  }, [loadMonthlyAndEvents]);

  // 3. Load Yearly Calendar when subView === 'yearly'
  useEffect(() => {
    if (subView !== 'yearly') return;
    let mounted = true;
    const fetchYear = async () => {
      setIsLoadingYear(true);
      try {
        const res = await mabimsHijriApi.getYearCalendar(selectedHijriYear);
        if (mounted) setYearData(res);
      } catch (err) {
        if (mounted) {
          onShowToast(
            err instanceof Error ? err.message : 'Gagal memuat kalender tahunan.'
          );
        }
      } finally {
        if (mounted) setIsLoadingYear(false);
      }
    };
    fetchYear();
    return () => {
      mounted = false;
    };
  }, [subView, selectedHijriYear, onShowToast]);

  // 4. Load Events when subView === 'events'
  useEffect(() => {
    if (subView !== 'events') return;
    let mounted = true;
    const fetchEv = async () => {
      setIsLoadingEvents(true);
      try {
        const res = await mabimsHijriApi.getEvents(selectedHijriYear);
        if (mounted) setEventsList(res.events || []);
      } catch (err) {
        if (mounted) {
          onShowToast(
            err instanceof Error ? err.message : 'Gagal memuat hari besar Islam.'
          );
        }
      } finally {
        if (mounted) setIsLoadingEvents(false);
      }
    };
    fetchEv();
    return () => {
      mounted = false;
    };
  }, [subView, selectedHijriYear, onShowToast]);

  // Navigate Previous / Next Hijri Month
  const handlePrevMonth = () => {
    if (selectedHijriMonth === 1) {
      setSelectedHijriMonth(12);
      setSelectedHijriYear((y) => y - 1);
    } else {
      setSelectedHijriMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedHijriMonth === 12) {
      setSelectedHijriMonth(1);
      setSelectedHijriYear((y) => y + 1);
    } else {
      setSelectedHijriMonth((m) => m + 1);
    }
  };

  // Date Conversion Handler
  const handleRunConversion = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsConverting(true);
    setConvError(null);
    try {
      const calendarType = convDirection === 'g2h' ? 'gregorian' : 'hijri';
      const res = await mabimsHijriApi.convertDate(convInputDate, calendarType);
      setConvResult(res);
    } catch (err) {
      setConvError(
        err instanceof Error
          ? err.message
          : 'Gagal mengonversi tanggal. Pastikan format YYYY-MM-DD benar.'
      );
    } finally {
      setIsConverting(false);
    }
  };

  // Run initial conversion once when switching to converter tab
  useEffect(() => {
    if (subView === 'converter' && !convResult && !convError) {
      handleRunConversion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subView]);

  // Map events by Hijri date for quick lookup in monthly grid
  const eventsByHijriDate = useMemo(() => {
    const map = new Map<string, MabimsEventItem[]>();
    for (const ev of eventsList) {
      const existing = map.get(ev.hijri) || [];
      existing.push(ev);
      map.set(ev.hijri, existing);
    }
    return map;
  }, [eventsList]);

  // Compute leading empty cells for the 7-day calendar grid (Ahad = 0 ... Sabtu = 6)
  const leadingEmptyDays = useMemo(() => {
    if (monthItems.length === 0) return 0;
    const firstWeekday = monthItems[0].weekday;
    const idx = WEEKDAYS_ID.findIndex(
      (w) => w.toLowerCase() === firstWeekday.toLowerCase()
    );
    if (idx >= 0) return idx;
    // Fallback via Gregorian Date
    const d = new Date(`${monthItems[0].gregorian}T00:00:00`);
    return Number.isNaN(d.getTime()) ? 0 : d.getDay();
  }, [monthItems]);

  const monthMeta = HIJRI_MONTH_NAMES[selectedHijriMonth] || {
    latin: `Bulan ${selectedHijriMonth}`,
    arabic: '',
  };

  const monthPrimarySource: MabimsSourceType =
    monthItems[0]?.source || todayData?.source || 'mabims';

  return (
    <div className="container-app py-4 sm:py-6">
      {/* Header Editorial */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[#E3E9E3] pb-5 md:flex-row md:items-end">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#24352B] sm:text-3xl">
            Kalender Hijriah
          </h1>
          <p className="mt-1 text-sm text-[#68756C]">
            Penanggalan Islam dan perkiraan hari besar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadMonthlyAndEvents(true)}
          disabled={isLoadingMonth}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3E9E3] bg-white px-3.5 py-2 text-xs font-semibold text-[#24352B] hover:border-[#046D38] hover:text-[#035328] disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingMonth ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Today's Hijri Banner */}
      <section className="mb-6 rounded-2xl border border-[#035328] bg-[#035328] p-5 text-white sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#FBC647]">
              Hari Ini
            </div>
            {isLoadingToday && !todayData ? (
              <div className="mt-2 h-8 w-64 animate-pulse rounded bg-[#046D38]" />
            ) : todayData ? (
              <>
                <h2 className="mt-1 font-serif text-2xl font-bold sm:text-3xl">
                  {todayData.output.weekday}, {todayData.output.day}{' '}
                  {todayData.output.month_name} {todayData.output.year} H
                </h2>
                <p className="mt-1 text-xs text-white/85">
                  Masehi:{' '}
                  <span className="font-mono font-semibold text-white">
                    {todayData.input.date}
                  </span>{' '}
                  ({todayData.input.tz})
                </p>
              </>
            ) : (
              <h2 className="mt-1 font-serif text-xl font-bold">
                Kalender Hijriah {selectedHijriYear} H
              </h2>
            )}
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            {todayData && renderSourceBadge(todayData.source)}
          </div>
        </div>
      </section>

      {/* Sub-navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            { id: 'monthly', label: 'Kalender Bulanan' },
            { id: 'events', label: 'Hari Besar Islam' },
            { id: 'converter', label: 'Konversi Tanggal' },
            { id: 'yearly', label: 'Ringkasan Tahunan' },
          ] as Array<{ id: SubViewMode; label: string }>
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubView(tab.id)}
            className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors ${
              subView === tab.id
                ? 'border-[#035328] bg-[#035328] text-white'
                : 'border-[#E3E9E3] bg-white text-[#24352B] hover:border-[#046D38]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. SUBVIEW: KALENDER BULANAN */}
      {subView === 'monthly' && (
        <section className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6">
          {/* Month & Year Controls */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#E3E9E3] pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Bulan Hijriah sebelumnya"
                className="rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-2 text-[#24352B] hover:border-[#035328]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="px-2 text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl font-bold text-[#24352B] sm:text-2xl">
                    {monthMeta.latin} {selectedHijriYear} H
                  </h2>
                  {monthMeta.arabic && (
                    <span className="font-arabic text-lg text-[#046D38]">
                      {monthMeta.arabic}
                    </span>
                  )}
                </div>
                {monthItems.length > 0 && (
                  <p className="text-xs text-[#68756C]">
                    Masehi: {monthItems[0].gregorian} s.d.{' '}
                    {monthItems[monthItems.length - 1].gregorian} ({monthItems.length}{' '}
                    hari)
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Bulan Hijriah berikutnya"
                className="rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-2 text-[#24352B] hover:border-[#035328]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {renderSourceBadge(monthPrimarySource)}

              <select
                aria-label="Pilih Bulan Hijriah"
                value={selectedHijriMonth}
                onChange={(e) => setSelectedHijriMonth(Number(e.target.value))}
                className="rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3 py-2 text-xs font-semibold text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
              >
                {Object.entries(HIJRI_MONTH_NAMES).map(([num, meta]) => (
                  <option key={num} value={Number(num)}>
                    {num}. {meta.latin}
                  </option>
                ))}
              </select>

              <select
                aria-label="Pilih Tahun Hijriah"
                value={selectedHijriYear}
                onChange={(e) => setSelectedHijriYear(Number(e.target.value))}
                className="rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3 py-2 text-xs font-semibold text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
              >
                {[1445, 1446, 1447, 1448, 1449, 1450].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} H
                  </option>
                ))}
              </select>
            </div>
          </div>

          {monthError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/40 p-4 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{monthError}</span>
            </div>
          )}

          {isLoadingMonth ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl border border-[#E3E9E3] bg-[#F7F8F5]"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Weekday Header */}
              <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2 text-center">
                {WEEKDAYS_ID.map((dayName, idx) => (
                  <div
                    key={dayName}
                    className={`rounded-lg py-1.5 sm:py-2 text-[9px] min-[360px]:text-[11px] font-bold uppercase tracking-normal min-[360px]:tracking-wider truncate ${
                      idx === 5
                        ? 'bg-[#035328] text-[#FBC647]'
                        : 'bg-[#F7F8F5] text-[#68756C]'
                    }`}
                  >
                    {dayName.slice(0, 3)}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: leadingEmptyDays }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[58px] min-[360px]:min-h-[68px] sm:min-h-[88px] rounded-xl border border-dashed border-[#E3E9E3]/60 bg-[#F7F8F5]/40"
                  />
                ))}

                {monthItems.map((item) => {
                  const hijriDayNum = parseInt(item.hijri.split('-')[2], 10);
                  const isToday =
                    todayData?.output?.date === item.hijri ||
                    todayData?.input?.date === item.gregorian;
                  const dayEvents = eventsByHijriDate.get(item.hijri) || [];
                  const hasEvent = dayEvents.length > 0;

                  return (
                    <div
                      key={item.hijri}
                      className={`flex min-h-[58px] min-[360px]:min-h-[68px] sm:min-h-[88px] flex-col justify-between rounded-xl border p-1 min-[360px]:p-1.5 sm:p-2.5 transition-colors min-w-0 ${
                        isToday
                          ? 'border-[#035328] bg-[#035328] text-white'
                          : hasEvent
                            ? 'border-[#FBC647] bg-[#F7F8F5] text-[#24352B]'
                            : 'border-[#E3E9E3] bg-white text-[#24352B] hover:border-[#046D38]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-0.5 min-w-0">
                        <span
                          className={`font-serif text-sm min-[360px]:text-base sm:text-xl font-bold ${
                            isToday ? 'text-[#FBC647]' : 'text-[#24352B]'
                          }`}
                        >
                          {hijriDayNum}
                        </span>
                        {isToday && (
                          <span className="rounded bg-[#FBC647] px-1 py-0.2 text-[8px] sm:text-[9px] font-bold text-[#24352B] whitespace-nowrap">
                            <span className="hidden sm:inline">Hari Ini</span>
                            <span className="sm:hidden">Ini</span>
                          </span>
                        )}
                      </div>

                      <div>
                        {hasEvent && (
                          <div
                            className={`mb-0.5 sm:mb-1 truncate rounded px-1 py-0.2 text-[8.5px] min-[360px]:text-[10px] font-bold ${
                              isToday
                                ? 'bg-[#046D38] text-[#FBC647]'
                                : 'bg-[#035328] text-white'
                            }`}
                            title={dayEvents.map((e) => e.name).join(', ')}
                          >
                            {dayEvents[0].name}
                          </div>
                        )}
                        <div
                          className={`font-mono text-[8.5px] min-[360px]:text-[10px] sm:text-[11px] truncate ${
                            isToday ? 'text-white/85' : 'text-[#68756C]'
                          }`}
                        >
                          <span className="sm:hidden">{parseInt(item.gregorian.split('-')[2], 10)} M</span>
                          <span className="hidden sm:inline">{item.gregorian}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* 2. SUBVIEW: HARI BESAR ISLAM (EVENTS) */}
      {subView === 'events' && (
        <section className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E9E3] pb-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#24352B]">
                Daftar Hari Besar Islam Tahun {selectedHijriYear} H
              </h2>
              <p className="text-xs text-[#68756C]">
                Data hari besar Islam berdasarkan kalender MABIMS / Kemenag RI.
              </p>
            </div>

            <select
              aria-label="Pilih Tahun Hijriah untuk Hari Besar"
              value={selectedHijriYear}
              onChange={(e) => setSelectedHijriYear(Number(e.target.value))}
              className="rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3.5 py-2 text-xs font-bold text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
            >
              {[1445, 1446, 1447, 1448, 1449, 1450].map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr} H
                </option>
              ))}
            </select>
          </div>

          {isLoadingEvents ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl border border-[#E3E9E3] bg-[#F7F8F5]"
                />
              ))}
            </div>
          ) : eventsList.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#68756C]">
              Tidak ada data hari besar Islam untuk tahun {selectedHijriYear} H.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              {eventsList.map((ev) => {
                const [, mStr, dStr] = ev.hijri.split('-');
                const mNum = parseInt(mStr, 10);
                const mName = HIJRI_MONTH_NAMES[mNum]?.latin || mStr;

                return (
                  <div
                    key={`${ev.event}-${ev.hijri}`}
                    className="flex flex-col justify-between rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 shrink-0 text-[#035328]" />
                        <h3 className="font-serif text-base font-bold text-[#24352B]">
                          {ev.name}
                        </h3>
                      </div>
                      {renderSourceBadge(ev.source)}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E9E3] pt-3 text-xs">
                      <div>
                        <span className="text-[#68756C]">Tanggal Hijriah: </span>
                        <strong className="font-semibold text-[#035328]">
                          {parseInt(dStr, 10)} {mName} {selectedHijriYear} H
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#68756C]">Masehi: </span>
                        <strong className="font-mono font-semibold text-[#24352B]">
                          {ev.gregorian}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 3. SUBVIEW: KONVERSI TANGGAL MASEHI <-> HIJRIAH */}
      {subView === 'converter' && (
        <section className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6">
          <div className="mb-4 border-b border-[#E3E9E3] pb-4">
            <h2 className="font-serif text-xl font-bold text-[#24352B]">
              Konversi Tanggal Masehi & Hijriah (2 Arah)
            </h2>
            <p className="text-xs text-[#68756C]">
              Konversi akurat menggunakan endpoint resmi MABIMS.dev (/api/v1/convert).
            </p>
          </div>

          <form onSubmit={handleRunConversion} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <label
                  htmlFor="conv-direction"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#68756C]"
                >
                  Arah Konversi
                </label>
                <select
                  id="conv-direction"
                  value={convDirection}
                  onChange={(e) => {
                    const nextDir = e.target.value as 'g2h' | 'h2g';
                    setConvDirection(nextDir);
                    setConvResult(null);
                    setConvError(null);
                    if (nextDir === 'g2h') {
                      setConvInputDate(new Date().toISOString().slice(0, 10));
                    } else {
                      setConvInputDate(todayData?.output?.date || '1447-09-01');
                    }
                  }}
                  className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3.5 py-2.5 text-sm font-medium text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
                >
                  <option value="g2h">Masehi (Gregorian) → Hijriah</option>
                  <option value="h2g">Hijriah → Masehi (Gregorian)</option>
                </select>
              </div>

              <div className="sm:col-span-5">
                <label
                  htmlFor="conv-date-input"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#68756C]"
                >
                  {convDirection === 'g2h'
                    ? 'Tanggal Masehi (YYYY-MM-DD)'
                    : 'Tanggal Hijriah (YYYY-MM-DD)'}
                </label>
                <input
                  id="conv-date-input"
                  type={convDirection === 'g2h' ? 'date' : 'text'}
                  value={convInputDate}
                  onChange={(e) => setConvInputDate(e.target.value)}
                  placeholder={convDirection === 'g2h' ? '2026-04-19' : '1447-09-01'}
                  required
                  className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3.5 py-2.5 font-mono text-sm text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-end sm:col-span-2">
                <button
                  type="submit"
                  disabled={isConverting}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#035328] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#046D38] disabled:opacity-50"
                >
                  <ArrowLeftRight className="h-4 w-4 text-[#FBC647]" />
                  <span>{isConverting ? 'Proses...' : 'Konversi'}</span>
                </button>
              </div>
            </div>
          </form>

          {convError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/40 p-4 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{convError}</span>
            </div>
          )}

          {convResult && (
            <div className="mt-5 rounded-2xl border border-[#E3E9E3] bg-[#F7F8F5] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#68756C]">
                  Hasil Konversi Tanggal
                </span>
                {renderSourceBadge(convResult.source)}
              </div>

              <div className="mt-3 font-serif text-2xl font-bold text-[#035328] sm:text-3xl">
                {convResult.output.weekday}, {convResult.output.day}{' '}
                {convResult.output.month_name} {convResult.output.year}{' '}
                {convResult.output.calendar === 'hijri' ? 'H' : 'M'}
              </div>

              <div className="mt-2 text-xs text-[#24352B]">
                Format ISO:{' '}
                <span className="font-mono font-bold">{convResult.output.date}</span> •
                Input Asal:{' '}
                <span className="font-mono font-semibold">{convResult.input.date}</span> (
                {convResult.input.calendar})
              </div>

              {Array.isArray(convResult.warnings) && convResult.warnings.length > 0 && (
                <div className="mt-3 rounded-xl border border-[#FBC647] bg-white p-3 text-xs text-[#24352B]">
                  <strong>Catatan Peringatan API:</strong> {convResult.warnings.join(' ')}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 4. SUBVIEW: RINGKASAN KALENDER TAHUNAN */}
      {subView === 'yearly' && (
        <section className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E9E3] pb-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#24352B]">
                Kalender Tahunan {selectedHijriYear} H (12 Bulan Hijriah)
              </h2>
              <p className="text-xs text-[#68756C]">
                Klik salah satu bulan untuk membuka tampilan kalender bulanan secara lengkap.
              </p>
            </div>

            <select
              aria-label="Pilih Tahun Hijriah untuk Kalender Tahunan"
              value={selectedHijriYear}
              onChange={(e) => setSelectedHijriYear(Number(e.target.value))}
              className="rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3.5 py-2 text-xs font-bold text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
            >
              {[1445, 1446, 1447, 1448, 1449, 1450].map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr} H
                </option>
              ))}
            </select>
          </div>

          {isLoadingYear || !yearData ? (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-[#E3E9E3] bg-[#F7F8F5]"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(HIJRI_MONTH_NAMES).map(([mKey, meta]) => {
                const days = yearData.months?.[mKey] || [];
                const firstDay = days[0];
                const lastDay = days[days.length - 1];
                const mNum = Number(mKey);

                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => {
                      setSelectedHijriMonth(mNum);
                      setSubView('monthly');
                    }}
                    className="flex flex-col justify-between rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-4 text-left transition-colors hover:border-[#035328] hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#046D38]">
                          Bulan ke-{mKey}
                        </span>
                        <h3 className="font-serif text-lg font-bold text-[#24352B]">
                          {meta.latin}
                        </h3>
                      </div>
                      <span className="font-arabic text-lg text-[#035328]">
                        {meta.arabic}
                      </span>
                    </div>

                    <div className="mt-3 border-t border-[#E3E9E3] pt-2.5 text-xs text-[#68756C]">
                      {firstDay && lastDay ? (
                        <div className="flex items-center justify-between">
                          <span>
                            {firstDay.gregorian} — {lastDay.gregorian}
                          </span>
                          <span className="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-[#035328]">
                            {days.length} hari
                          </span>
                        </div>
                      ) : (
                        <span>Data bulan belum tersedia</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
