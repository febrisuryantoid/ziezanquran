import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Compass,
  Globe,
  Info,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  houseMuslimQiblaApi,
  INDONESIAN_PRESET_CITIES,
  validateCoordinates,
} from '../services/islamicApi';
import { storageService } from '../services/storageService';
import { CompassSensorStatus, QiblaData } from '../types/islamic';

interface QiblaViewProps {
  onShowToast: (msg: string) => void;
}

interface DeviceOrientationEventWithWebkit extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

interface DeviceOrientationEventStatic {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

export const QiblaView: React.FC<QiblaViewProps> = ({ onShowToast }) => {
  const savedPref = storageService.getQiblaPreference();

  // Default to Jakarta or user's explicitly saved coarse preference
  const [latInput, setLatInput] = useState<string>(
    savedPref ? String(savedPref.coarseLat) : '-6.2088'
  );
  const [lngInput, setLngInput] = useState<string>(
    savedPref ? String(savedPref.coarseLng) : '106.8456'
  );
  const [locationLabel, setLocationLabel] = useState<string>(
    savedPref ? savedPref.label : 'Jakarta (DKI Jakarta)'
  );
  const [consentSaveCoarse, setConsentSaveCoarse] = useState<boolean>(
    Boolean(savedPref?.consentGiven)
  );

  const [qiblaData, setQiblaData] = useState<QiblaData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<
    'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'
  >('idle');

  // Device Orientation Compass State
  const [sensorStatus, setSensorStatus] = useState<CompassSensorStatus>('idle');
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);

  const fetchQiblaDirection = useCallback(
    async (lat: number, lng: number, labelText: string, forceRefresh = false) => {
      const check = validateCoordinates(lat, lng);
      if (!check.valid) {
        setError(check.error || 'Koordinat tidak valid.');
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const data = await houseMuslimQiblaApi.getQibla(lat, lng, forceRefresh);
        setQiblaData(data);
        if (consentSaveCoarse) {
          storageService.saveQiblaPreference({
            label: labelText,
            lat,
            lng,
            consentGiven: true,
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Gagal menghitung arah kiblat.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [consentSaveCoarse]
  );

  useEffect(() => {
    const initialLat = parseFloat(latInput);
    const initialLng = parseFloat(lngInput);
    fetchQiblaDirection(initialLat, initialLng, locationLabel, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Explicit Geolocation Request (Never triggered automatically without user action)
  const handleRequestGpsLocation = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      onShowToast('Geolokasi GPS tidak tersedia pada browser/perangkat ini.');
      return;
    }

    setGpsStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;
        // Round to 4 decimals for display, never store raw precision unless consented (which rounds to 2 decimals)
        const cleanLat = Number(rawLat.toFixed(4));
        const cleanLng = Number(rawLng.toFixed(4));

        setLatInput(String(cleanLat));
        setLngInput(String(cleanLng));
        const nextLabel = 'Lokasi GPS Perangkat Anda';
        setLocationLabel(nextLabel);
        setGpsStatus('granted');

        fetchQiblaDirection(cleanLat, cleanLng, nextLabel, false);
        onShowToast('Koordinat lokasi berhasil diperbarui dari GPS perangkat.');
      },
      (geoErr) => {
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setGpsStatus('denied');
          onShowToast(
            'Izin lokasi ditolak. Anda tetap dapat memilih kota atau memasukkan koordinat manual.'
          );
        } else {
          setGpsStatus('unavailable');
          onShowToast('Gagal mendapatkan sinyal GPS. Gunakan pilihan kota di bawah.');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  // Preset City Selection
  const handleSelectPresetCity = (cityName: string) => {
    const preset = INDONESIAN_PRESET_CITIES.find((c) => c.name === cityName);
    if (!preset) return;
    setLatInput(String(preset.lat));
    setLngInput(String(preset.lng));
    setLocationLabel(preset.name);
    fetchQiblaDirection(preset.lat, preset.lng, preset.name, false);
  };

  // Manual Coordinate Form Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = parseFloat(latInput);
    const parsedLng = parseFloat(lngInput);
    const validation = validateCoordinates(parsedLat, parsedLng);
    if (!validation.valid) {
      setError(validation.error || 'Koordinat tidak valid.');
      return;
    }
    const label = `Koordinat Manual (${parsedLat.toFixed(2)}, ${parsedLng.toFixed(2)})`;
    setLocationLabel(label);
    fetchQiblaDirection(parsedLat, parsedLng, label, false);
  };

  // Consent Toggle Handler
  const handleToggleConsent = (checked: boolean) => {
    setConsentSaveCoarse(checked);
    if (!checked) {
      storageService.clearQiblaPreference();
      onShowToast('Preferensi lokasi kiblat dihapus dari penyimpanan lokal.');
    } else if (qiblaData) {
      storageService.saveQiblaPreference({
        label: locationLabel,
        lat: qiblaData.origin.lat,
        lng: qiblaData.origin.lng,
        consentGiven: true,
      });
      onShowToast('Lokasi kasar (dibulatkan 2 desimal) disimpan di perangkat.');
    }
  };

  // Device Orientation Sensor Handling
  useEffect(() => {
    if (sensorStatus !== 'active') return;

    let receivedValidReading = false;
    const timeoutId = window.setTimeout(() => {
      if (!receivedValidReading) {
        setSensorStatus('unsupported');
        setDeviceHeading(null);
      }
    }, 2500);

    const handleOrientation = (event: Event) => {
      const e = event as DeviceOrientationEventWithWebkit;
      let heading: number | null = null;

      if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
        // iOS True/Magnetic North heading
        heading = e.webkitCompassHeading;
      } else if (e.absolute === true && typeof e.alpha === 'number' && !Number.isNaN(e.alpha)) {
        // Android absolute orientation
        heading = (360 - e.alpha) % 360;
      } else if (typeof e.alpha === 'number' && !Number.isNaN(e.alpha)) {
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null) {
        receivedValidReading = true;
        window.clearTimeout(timeoutId);
        setDeviceHeading(Math.round(heading * 10) / 10);
      }
    };

    const win = window as Window & typeof globalThis;
    win.addEventListener('deviceorientationabsolute', handleOrientation, true);
    win.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.clearTimeout(timeoutId);
      win.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      win.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [sensorStatus]);

  const handleActivateCompassSensor = async () => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setSensorStatus('unsupported');
      onShowToast('Perangkat/browser ini tidak memiliki sensor orientasi kompas.');
      return;
    }

    setSensorStatus('requesting');
    const DOE = DeviceOrientationEvent as unknown as DeviceOrientationEventStatic;

    if (typeof DOE.requestPermission === 'function') {
      try {
        const permission = await DOE.requestPermission();
        if (permission === 'granted') {
          setSensorStatus('active');
        } else {
          setSensorStatus('denied');
          onShowToast('Izin sensor orientasi perangkat ditolak.');
        }
      } catch {
        setSensorStatus('denied');
        onShowToast('Gagal meminta izin sensor orientasi perangkat.');
      }
    } else {
      setSensorStatus('active');
    }
  };

  const handleStopCompassSensor = () => {
    setSensorStatus('idle');
    setDeviceHeading(null);
  };

  const qiblaBearing = qiblaData?.bearing_deg ?? 295.16;
  const isSensorLive = sensorStatus === 'active' && deviceHeading !== null;

  // Dial rotation: if sensor is live, rotate compass ring by -deviceHeading so North matches real North;
  // if sensor is NOT live, keep dial static at 0 deg (True North at top) and never pretend it rotates.
  const dialRotationDeg = isSensorLive ? -deviceHeading : 0;
  const relativeAngleDiff = isSensorLive
    ? Math.abs((((qiblaBearing - deviceHeading) % 360) + 540) % 360 - 180)
    : null;
  const isAlignedWithQibla =
    relativeAngleDiff !== null && relativeAngleDiff <= 6;

  return (
    <div className="container-app py-4 sm:py-6">
      {/* Editorial Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[#E3E9E3] pb-5 md:flex-row md:items-end">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#24352B] sm:text-3xl">
            Arah Kiblat
          </h1>
          <p className="mt-1 text-sm text-[#68756C]">
            Penentu sudut presisi ke Ka&apos;bah di Makkah.
          </p>
        </div>

        {qiblaData && (
          <button
            type="button"
            onClick={() =>
              fetchQiblaDirection(
                qiblaData.origin.lat,
                qiblaData.origin.lng,
                locationLabel,
                true
              )
            }
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E3E9E3] bg-white px-3.5 py-2 text-xs font-semibold text-[#24352B] hover:border-[#046D38] hover:text-[#035328] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Hitung Ulang</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Visual Compass & Sensor Status */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl border border-[#E3E9E3] bg-white p-5 sm:p-6">
            {/* Sensor Status Banner */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-[#046D38]" />
                <span className="text-xs font-bold text-[#24352B]">
                  {isSensorLive
                    ? 'Kompas Sensor Aktif'
                    : 'Kompas Statis (Koordinat)'}
                </span>
              </div>

              {isSensorLive ? (
                <button
                  type="button"
                  onClick={handleStopCompassSensor}
                  className="rounded-lg border border-[#E3E9E3] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#24352B] hover:border-[#035328]"
                >
                  Matikan Sensor
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleActivateCompassSensor}
                  className="rounded-lg bg-[#035328] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#046D38]"
                >
                  Gunakan Sensor
                </button>
              )}
            </div>

            {/* Concise Sensor Guidance */}
            <p className="mb-4 text-xs text-[#68756C]">
              {isSensorLive
                ? `Sensor aktif (${deviceHeading}°). Putar perangkat hingga jarum emas sejajar penanda atas.`
                : 'Arahkan perangkat sesuai derajat yang tertera terhadap arah Utara.'}
            </p>

            {/* Visual SVG Compass */}
            <div className="relative mx-auto my-2 flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
              {/* Top Reference Pointer */}
              <div className="absolute -top-3 z-20 flex flex-col items-center">
                <div className="rounded bg-[#035328] px-2 py-0.5 text-[10px] font-bold text-white">
                  {isSensorLive ? 'ARAH PERANGKAT' : 'UTARA SEJATI (0°)'}
                </div>
                <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#035328]" />
              </div>

              {/* Rotating / Static Compass Dial */}
              <svg
                viewBox="0 0 260 260"
                className="h-full w-full transition-transform duration-200 ease-out"
                style={{ transform: `rotate(${dialRotationDeg}deg)` }}
                role="img"
                aria-label={`Kompas Kiblat menunjuk ke ${qiblaBearing} derajat dari Utara`}
              >
                {/* Outer Ring */}
                <circle
                  cx="130"
                  cy="130"
                  r="120"
                  fill="#F7F8F5"
                  stroke="#E3E9E3"
                  strokeWidth="2"
                />
                <circle
                  cx="130"
                  cy="130"
                  r="104"
                  fill="#FFFFFF"
                  stroke="#E3E9E3"
                  strokeWidth="1.5"
                />

                {/* Degree Tick Marks every 15 deg */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const deg = i * 15;
                  const isMajor = deg % 90 === 0;
                  return (
                    <g key={deg} transform={`rotate(${deg} 130 130)`}>
                      <line
                        x1="130"
                        y1={isMajor ? '12' : '15'}
                        x2="130"
                        y2={isMajor ? '24' : '21'}
                        stroke={isMajor ? '#035328' : '#68756C'}
                        strokeWidth={isMajor ? '2.5' : '1.2'}
                      />
                    </g>
                  );
                })}

                {/* Cardinal Labels (U, T, S, B) */}
                <text
                  x="130"
                  y="39"
                  textAnchor="middle"
                  className="fill-[#035328] text-sm font-bold"
                >
                  U (0°)
                </text>
                <text
                  x="224"
                  y="134"
                  textAnchor="middle"
                  className="fill-[#68756C] text-xs font-bold"
                >
                  T (90°)
                </text>
                <text
                  x="130"
                  y="230"
                  textAnchor="middle"
                  className="fill-[#68756C] text-xs font-bold"
                >
                  S (180°)
                </text>
                <text
                  x="36"
                  y="134"
                  textAnchor="middle"
                  className="fill-[#68756C] text-xs font-bold"
                >
                  B (270°)
                </text>

                {/* Qibla Bearing Ray & Kaaba Pointer rotated at qiblaBearing from North */}
                <g transform={`rotate(${qiblaBearing} 130 130)`}>
                  {/* Ray line */}
                  <line
                    x1="130"
                    y1="130"
                    x2="130"
                    y2="46"
                    stroke="#035328"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Gold Arrowhead */}
                  <polygon
                    points="130,34 122,52 138,52"
                    fill="#FBC647"
                    stroke="#035328"
                    strokeWidth="1.5"
                  />
                  {/* Kaaba Emblem Box */}
                  <rect
                    x="122"
                    y="55"
                    width="16"
                    height="16"
                    rx="3"
                    fill="#24352B"
                    stroke="#FBC647"
                    strokeWidth="2"
                  />
                  <line
                    x1="122"
                    y1="60"
                    x2="138"
                    y2="60"
                    stroke="#FBC647"
                    strokeWidth="2"
                  />
                </g>

                {/* Center Hub */}
                <circle
                  cx="130"
                  cy="130"
                  r="8"
                  fill="#035328"
                  stroke="#FBC647"
                  strokeWidth="2.5"
                />
              </svg>
            </div>

            {/* Alignment Status or Static Degree Readout */}
            <div
              className={`mt-4 rounded-xl border p-3.5 text-center ${
                isAlignedWithQibla
                  ? 'border-[#035328] bg-[#035328] text-white'
                  : 'border-[#E3E9E3] bg-[#F7F8F5] text-[#24352B]'
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                {locationLabel}
              </div>
              <div className="mt-1 flex items-center justify-center gap-2 font-serif text-2xl font-bold">
                <span>{qiblaBearing.toFixed(2)}° dari Utara Sejati</span>
              </div>
              <div className="mt-1 text-xs">
                {qiblaData
                  ? `${qiblaData.compass_id} (${qiblaData.compass_en} / ${qiblaData.cardinal8})`
                  : 'Barat barat laut (WNW)'}
                {isSensorLive && relativeAngleDiff !== null && (
                  <span className="ml-2 font-semibold">
                    •{' '}
                    {isAlignedWithQibla
                      ? 'Tepat Menghadap Kiblat'
                      : `Selisih ${relativeAngleDiff.toFixed(1)}°`}
                  </span>
                )}
              </div>
            </div>

            {/* Telemetry Cards */}
            {qiblaData && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-3">
                  <div className="text-[11px] font-semibold uppercase text-[#68756C]">
                    Sudut Kiblat
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold text-[#035328]">
                    {qiblaData.bearing_deg.toFixed(2)}°
                  </div>
                  <div className="text-[11px] text-[#68756C]">
                    Final: {qiblaData.final_bearing_deg.toFixed(2)}°
                  </div>
                </div>

                <div className="rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-3">
                  <div className="text-[11px] font-semibold uppercase text-[#68756C]">
                    Jarak ke Ka'bah
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold text-[#24352B]">
                    {qiblaData.distance_km.toLocaleString('id-ID')} km
                  </div>
                  <div className="text-[11px] text-[#68756C]">
                    {qiblaData.distance_mi.toLocaleString('id-ID')} mil
                  </div>
                </div>

                <div className="col-span-2 rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] p-3 sm:col-span-1">
                  <div className="text-[11px] font-semibold uppercase text-[#68756C]">
                    Titik Referensi
                  </div>
                  <div className="mt-1 truncate text-xs font-bold text-[#24352B]">
                    {qiblaData.kaaba.name}
                  </div>
                  <div className="font-mono text-[11px] text-[#68756C]">
                    {qiblaData.kaaba.lat}, {qiblaData.kaaba.lng}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Explicit Geolocation, Preset Cities & Manual Coordinate Form */}
        <div className="space-y-5 lg:col-span-6">
          {/* 1. Geolocation Permission Card */}
          <div className="rounded-2xl border border-[#E3E9E3] bg-white p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-bold text-[#24352B]">
                Lokasi GPS
              </h2>
              <Navigation className="h-4 w-4 shrink-0 text-[#046D38]" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRequestGpsLocation}
                disabled={gpsStatus === 'requesting'}
                className="inline-flex items-center gap-2 rounded-xl bg-[#035328] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#046D38] disabled:opacity-50 cursor-pointer"
              >
                <MapPin className="h-4 w-4 text-[#FBC647]" />
                <span>
                  {gpsStatus === 'requesting'
                    ? 'Mendeteksi...'
                    : 'Gunakan Lokasi GPS'}
                </span>
              </button>

              {gpsStatus === 'granted' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#046D38]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>GPS Aktif</span>
                </span>
              )}
              {gpsStatus === 'denied' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>Izin Ditolak</span>
                </span>
              )}
            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-[#68756C]">
              <input
                type="checkbox"
                checked={consentSaveCoarse}
                onChange={(e) => handleToggleConsent(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#E3E9E3] accent-[#035328]"
              />
              <span>Simpan preferensi lokasi di perangkat ini</span>
            </label>
          </div>

          {/* 2. City Presets */}
          <div className="rounded-2xl border border-[#E3E9E3] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#24352B]">
                Pilihan Kota
              </h2>
              <Globe className="h-4 w-4 text-[#046D38]" />
            </div>

            <select
              aria-label="Pilih Kota di Indonesia"
              value={
                INDONESIAN_PRESET_CITIES.some((c) => c.name === locationLabel)
                  ? locationLabel
                  : ''
              }
              onChange={(e) => handleSelectPresetCity(e.target.value)}
              className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3.5 py-2.5 text-sm font-medium text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
            >
              <option value="" disabled>
                -- Pilih Kota di Indonesia --
              </option>
              {INDONESIAN_PRESET_CITIES.map((city) => (
                <option key={city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Manual Coordinate Input */}
          <form
            onSubmit={handleManualSubmit}
            className="rounded-2xl border border-[#E3E9E3] bg-white p-5"
          >
            <h2 className="text-sm font-bold text-[#24352B]">
              Koordinat Manual
            </h2>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-xs font-medium text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="qibla-lat-input"
                  className="mb-1 block text-xs font-semibold text-[#68756C]"
                >
                  Lintang (Latitude)
                </label>
                <input
                  id="qibla-lat-input"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  required
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3 py-2 font-mono text-sm text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
                  placeholder="-6.2088"
                />
              </div>

              <div>
                <label
                  htmlFor="qibla-lng-input"
                  className="mb-1 block text-xs font-semibold text-[#68756C]"
                >
                  Bujur (Longitude)
                </label>
                <input
                  id="qibla-lng-input"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  required
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  className="w-full rounded-xl border border-[#E3E9E3] bg-[#F7F8F5] px-3 py-2 font-mono text-sm text-[#24352B] focus:border-[#046D38] focus:bg-white focus:outline-none"
                  placeholder="106.8456"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-3.5 inline-flex items-center gap-2 rounded-xl border border-[#035328] bg-white px-4 py-2 text-xs font-bold text-[#035328] transition-colors hover:bg-[#035328] hover:text-white disabled:opacity-50 cursor-pointer"
            >
              <Compass className="h-4 w-4" />
              <span>Hitung Arah Kiblat</span>
            </button>
          </form>

          {/* Attribution Note */}
          <div className="rounded-2xl border border-[#E3E9E3] bg-white px-4 py-3 flex items-center gap-2 text-xs text-[#68756C]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#046D38]" />
            <span>
              Perhitungan sudut geodesik Ka&apos;bah Makkah (House Muslim API).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
