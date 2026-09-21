"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { RadarPin } from "@/types";

// Fix leaflet default icon paths for Next.js (avoid 404s even though we use divIcon)
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl as unknown as never;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

interface LeafletMapCoreProps {
  pins: RadarPin[];
  selectedPin: RadarPin | null;
  onSelectPin: (pin: RadarPin) => void;
  userPos: [number, number];
  onNavigate: (view: string, extra?: unknown) => void;
}

function getPinHex(type: string) {
  switch (type) {
    case "friend":
      return "#10b981";
    case "business":
      return "#f59e0b";
    case "event":
      return "#0ea5e9";
    case "deal":
      return "#f43f5e";
    case "listing":
      return "#fbbf24";
    case "service":
      return "#34d399";
    default:
      return "#10b981";
  }
}

function getPinBg(type: string) {
  switch (type) {
    case "friend":
      return "rgba(16,185,129,0.18)";
    case "business":
      return "rgba(245,158,11,0.18)";
    case "event":
      return "rgba(14,165,233,0.18)";
    case "deal":
      return "rgba(244,63,94,0.18)";
    case "listing":
      return "rgba(251,191,36,0.18)";
    case "service":
      return "rgba(52,211,153,0.18)";
    default:
      return "rgba(16,185,129,0.18)";
  }
}

function createPinIcon(pin: RadarPin, isSelected: boolean) {
  const color = getPinHex(pin.type);
  const bg = getPinBg(pin.type);
  const safeName = pin.name.replace(/"/g, "&quot;");
  const borderWidth = isSelected ? "3px" : "2px";
  const ring = isSelected ? `box-shadow: 0 0 0 3px ${color}55, 0 6px 18px rgba(0,0,0,0.6); transform: scale(1.08);` : "box-shadow: 0 4px 14px rgba(0,0,0,0.55);";
  const html = `
    <div style="
      width: 38px; height: 38px;
      border-radius: 12px;
      border: ${borderWidth} solid ${color};
      background: ${bg};
      backdrop-filter: blur(6px);
      display:flex; align-items:center; justify-content:center;
      overflow:hidden;
      position:relative;
      ${ring}
      transition: transform 150ms ease;
    ">
      <img src="${pin.avatar}" alt="${safeName}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" />
      <span style="
        position:absolute; bottom:-2px; right:-2px;
        width:12px; height:12px; border-radius:9999px;
        background:${color}; border:2px solid #060c0c;
        display:block;
      "></span>
    </div>
  `;
  return L.divIcon({
    className: "kinara-radar-pin",
    html,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
  });
}

function createUserIcon() {
  const html = `
    <div style="position:relative; width:46px; height:46px; display:flex; align-items:center; justify-content:center;">
      <div style="
        position:absolute; width:46px; height:46px; border-radius:9999px;
        background: rgba(16,185,129,0.14); border: 2px solid rgba(16,185,129,0.5);
        animation: kinaraVoicePulse 2s infinite;
      "></div>
      <div style="
        width:16px; height:16px; border-radius:9999px;
        background:#10b981; border:3px solid #ffffff;
        box-shadow: 0 0 12px rgba(16,185,129,0.9), 0 0 24px rgba(16,185,129,0.5);
        position:relative; z-index:1;
      "></div>
    </div>
  `;
  return L.divIcon({
    className: "kinara-user-pin",
    html,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -26],
  });
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function LeafletMapCore({
  pins,
  selectedPin,
  onSelectPin,
  userPos,
  onNavigate,
}: LeafletMapCoreProps) {
  const validPins = useMemo(() => {
    return pins.filter((p) => {
      const lat = parseFloat(String(p.lat));
      const lng = parseFloat(String(p.lng));
      return Number.isFinite(lat) && Number.isFinite(lng);
    });
  }, [pins]);

  const handleRoute = (pin: RadarPin) => {
    const plat = parseFloat(String(pin.lat));
    const plng = parseFloat(String(pin.lng));
    const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userPos[0]},${userPos[1]};${plat},${plng}#map=14/${plat}/${plng}`;
    toast.success(`Routing to ${pin.name} • OSM directions opened`);
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleAction = (pin: RadarPin) => {
    switch (pin.type) {
      case "friend":
        onNavigate("messaging");
        toast.success(`Opening dispatch to ${pin.name}`);
        break;
      case "business":
        onNavigate("business");
        toast.success(`Opening storefront: ${pin.name}`);
        break;
      case "listing":
        onNavigate("marketplace");
        toast.success(`Opening listing: ${pin.name}`);
        break;
      case "event":
        toast.success(`RSVP Confirmed for ${pin.name}! Event pass saved to your Kinara wallet.`);
        break;
      case "deal":
        toast.success(`Deal Activated! Show QR at counter: KINARA-PERK-25 • ${pin.name}`);
        break;
      case "service":
        toast.success(`Service inquiry sent to ${pin.name}`);
        break;
      default:
        toast.info(`Viewing ${pin.name}`);
    }
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={userPos}
        zoom={14}
        scrollWheelZoom
        zoomControl
        attributionControl
        className="w-full h-full"
        style={{ height: "100%", width: "100%", background: "#060c0c", zIndex: 0 }}
      >
        <Recenter center={userPos} />
        {/* CARTO Light — free, nicer than raw OSM; fallback to OSM if desired */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c", "d"]}
          maxZoom={19}
        />
        {/* User location marker */}
        <Marker position={userPos} icon={createUserIcon()} zIndexOffset={1000}>
          <Popup className="kinara-leaflet-popup">
            <div style={{ minWidth: 180, fontFamily: "ui-sans-serif, system-ui" }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#064e3b", marginBottom: 2 }}>You — Brian • Kilimani</div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>Current location • Opt-in live • Voice enabled</div>
              <div style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#059669", background: "#ecfdf5", padding: "4px 6px", borderRadius: 6, border: "1px solid #a7f3d0" }}>
                GPS: {userPos[0].toFixed(4)}, {userPos[1].toFixed(4)} • 5.0 KM RADIUS
              </div>
            </div>
          </Popup>
        </Marker>

        {validPins.map((pin) => {
          const plat = parseFloat(String(pin.lat));
          const plng = parseFloat(String(pin.lng));
          const isSelected = selectedPin?.id === pin.id;
          return (
            <Marker
              key={pin.id}
              position={[plat, plng]}
              icon={createPinIcon(pin, isSelected)}
              eventHandlers={{
                click: () => onSelectPin(pin),
              }}
            >
              <Popup className="kinara-leaflet-popup" maxWidth={300} minWidth={240}>
                <div style={{ fontFamily: "ui-sans-serif, system-ui", color: "#0f172a" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <img
                      src={pin.avatar}
                      alt={pin.name}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        objectFit: "cover",
                        border: `2px solid ${getPinHex(pin.type)}`,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.2, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {pin.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        {pin.neighborhood}, {pin.city} • <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: getPinHex(pin.type) }}>{pin.distance}</span>
                      </div>
                      <div
                        style={{
                          display: "inline-block",
                          marginTop: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          color: pin.type === "business" || pin.type === "listing" ? "#92400e" : pin.type === "deal" ? "#9f1239" : "#065f46",
                          background: getPinBg(pin.type),
                          border: `1px solid ${getPinHex(pin.type)}55`,
                          padding: "2px 6px",
                          borderRadius: 9999,
                        }}
                      >
                        {pin.status}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "#334155",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "8px 10px",
                      marginBottom: 10,
                    }}
                  >
                    {pin.details}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {pin.type === "friend" && (
                      <button
                        onClick={() => handleAction(pin)}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "#059669",
                          color: "#ffffff",
                          fontWeight: 800,
                          fontSize: 12,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Send Quick Dispatch / Meet
                      </button>
                    )}
                    {pin.type === "business" && (
                      <button
                        onClick={() => handleAction(pin)}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "#059669",
                          color: "#ffffff",
                          fontWeight: 800,
                          fontSize: 12,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        View Storefront & Book Pod
                      </button>
                    )}
                    {pin.type === "listing" && (
                      <button
                        onClick={() => handleAction(pin)}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "#f59e0b",
                          color: "#000000",
                          fontWeight: 800,
                          fontSize: 12,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        View Listing & Escrow Buy
                      </button>
                    )}
                    {pin.type === "event" && (
                      <button
                        onClick={() => handleAction(pin)}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "#059669",
                          color: "#ffffff",
                          fontWeight: 800,
                          fontSize: 12,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        RSVP & Get Digital Pass
                      </button>
                    )}
                    {pin.type === "deal" && (
                      <button
                        onClick={() => handleAction(pin)}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "#f59e0b",
                          color: "#000000",
                          fontWeight: 800,
                          fontSize: 12,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Claim 25% Member Voucher
                      </button>
                    )}
                    {pin.type === "service" && (
                      <button
                        onClick={() => handleAction(pin)}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "#059669",
                          color: "#ffffff",
                          fontWeight: 800,
                          fontSize: 12,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Request Service
                      </button>
                    )}
                    <button
                      onClick={() => handleRoute(pin)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "#ffffff",
                        color: "#334155",
                        fontWeight: 700,
                        fontSize: 12,
                        border: "1px solid #e2e8f0",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ color: "#10b981" }}>↗</span> Get Turn-by-Turn Route
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Tactical rings overlay — keeps original radar aesthetic atop real map */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="absolute w-[160px] h-[160px] rounded-full border border-emerald-500/10 hidden sm:block" />
        <div className="absolute w-[280px] h-[280px] rounded-full border border-emerald-500/10 hidden sm:block" />
        <div className="absolute w-[420px] h-[420px] rounded-full border border-emerald-500/[0.06] hidden md:block" />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] via-transparent to-transparent" />
      </div>
    </div>
  );
}
