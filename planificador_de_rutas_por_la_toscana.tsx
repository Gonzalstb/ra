import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  RotateCcw, 
  Trash2, 
  Plus, 
  Image, 
  Info, 
  Compass, 
  Route, 
  Eye, 
  Award,
  BookOpen,
  Edit2,
  X,
  Check,
  Link2,
  Link2Off,
  Search,
  Map as MapIcon
} from 'lucide-react';

// Imágenes profesionales de la Toscana
const TOSCANA_PRESET_IMAGES = [
  { name: 'Florencia (Duomo)', url: 'https://images.unsplash.com/photo-1543012586-33916573c938?w=800&auto=format&fit=crop&q=80' },
  { name: 'San Gimignano (Torres)', url: 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9037?w=800&auto=format&fit=crop&q=80' },
  { name: 'Siena (Piazza del Campo)', url: 'https://images.unsplash.com/photo-1599818449779-1c6ca1653ff9?w=800&auto=format&fit=crop&q=80' },
  { name: 'Val d\'Orcia (Cipreses)', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80' },
  { name: 'Pisa (Torre Inclinada)', url: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&auto=format&fit=crop&q=80' },
  { name: 'Lucca (Murallas)', url: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80' }
];

// Presets de ciudades para el punto de partida rápido
const STARTING_PRESETS = [
  { name: "Florencia Centro", lat: 43.7696, lng: 11.2558 },
  { name: "Siena (Piazza Campo)", lat: 43.3188, lng: 11.3308 },
  { name: "Pisa Aeropuerto", lat: 43.6996, lng: 10.3984 },
  { name: "Lucca Casco Histórico", lat: 43.8429, lng: 10.5027 }
];

export default function App() {
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  // Capas del mapa para limpiarlas dinámicamente
  const mapLayersRef = useRef({
    markers: [],
    polylines: [],
    labels: []
  });

  // --- NUEVA ESTRUCTURA DE ESTADO: LISTA DE VIAJES INDEPENDIENTES ---
  const [trips, setTrips] = useState([
    {
      id: "trip-1",
      name: "Valle de Orcia y Siena",
      startingPoint: { lat: 43.7696, lng: 11.2558, name: "Florencia Centro" },
      destinations: [
        {
          id: "1",
          name: "Siena",
          description: "Preciosa ciudad medieval famosa por el Palio y su espectacular catedral gótica de mármol blanco y negro.",
          photoUrl: TOSCANA_PRESET_IMAGES[2].url,
          duration: "1h 15m",
          isRoundTrip: true,
          inRoute: true, 
          lat: 43.3188,
          lng: 11.3308
        },
        {
          id: "2",
          name: "San Gimignano",
          description: "El Manhattan de la Edad Media. Conserva 14 torres de piedra señoriales que dominan el horizonte toscano.",
          photoUrl: TOSCANA_PRESET_IMAGES[1].url,
          duration: "55 min",
          isRoundTrip: false,
          inRoute: false, 
          lat: 43.4674,
          lng: 11.0429
        },
        {
          id: "3",
          name: "Val d'Orcia",
          description: "Paisaje icónico de colinas doradas, hileras de cipreses perfectas y viñedos de Brunello de Montalcino.",
          photoUrl: TOSCANA_PRESET_IMAGES[3].url,
          duration: "1h 45m",
          isRoundTrip: true,
          inRoute: true, 
          lat: 43.0761,
          lng: 11.6789
        }
      ]
    },
    {
      id: "trip-2",
      name: "Ruta de la Costa Etrusca",
      startingPoint: { lat: 43.6996, lng: 10.3984, name: "Pisa Aeropuerto" },
      destinations: [
        {
          id: "coast-1",
          name: "Lucca Casco Histórico",
          description: "Famosa por sus murallas renacentistas intactas que rodean todo el centro de la ciudad y sus calles adoquinadas.",
          photoUrl: TOSCANA_PRESET_IMAGES[5].url,
          duration: "35 min",
          isRoundTrip: false,
          inRoute: true,
          lat: 43.8429,
          lng: 10.5027
        },
        {
          id: "coast-2",
          name: "Castagneto Carducci",
          description: "Precioso pueblo medieval situado en una colina de pinos y olivares con vistas increíbles del Mar Tirreno.",
          photoUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800',
          duration: "1h 10m",
          isRoundTrip: true,
          inRoute: true,
          lat: 43.1611,
          lng: 10.6111
        }
      ]
    }
  ]);

  // ID del viaje activo
  const [activeTripId, setActiveTripId] = useState("trip-1");

  // Obtener propiedades derivadas del viaje activo actual
  const activeTrip = trips.find(t => t.id === activeTripId) || trips[0];
  const startingPoint = activeTrip.startingPoint;
  const destinations = activeTrip.destinations;

  // Formulario de entrada
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formIsRoundTrip, setFormIsRoundTrip] = useState(false);
  const [formInRoute, setFormInRoute] = useState(true); 
  const [formCoords, setFormCoords] = useState({ lat: "", lng: "" });

  // Estados de los buscadores de direcciones en tiempo real
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [startPointSearchQuery, setStartPointSearchQuery] = useState("");
  const [isSearchingStartPoint, setIsSearchingStartPoint] = useState(false);

  // Modales personalizados de React
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, targetId: null, targetName: "" });
  const [deleteTripModal, setDeleteTripModal] = useState({ isOpen: false, targetId: null, targetName: "" });
  const [editStartModal, setEditStartModal] = useState({ isOpen: false, name: "", lat: "", lng: "" });
  const [newTripModal, setNewTripModal] = useState({ isOpen: false, name: "", startPresetIndex: 0 });

  // Estado de interfaz de usuario
  const [activeTab, setActiveTab] = useState("map");

  // Función genérica para actualizar campos específicos del viaje activo
  const updateActiveTrip = (fields) => {
    setTrips(prev => prev.map(t => t.id === activeTripId ? { ...t, ...fields } : t));
  };

  // Cargar recursos Leaflet.js
  useEffect(() => {
    const loadLeaflet = async () => {
      if (window.L) {
        setLeafletLoaded(true);
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    };
    loadLeaflet();
  }, []);

  // Inicialización del mapa de la Toscana
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstance.current) return;

    const map = window.L.map(mapRef.current, {
      center: [43.45, 11.15],
      zoom: 9,
      zoomControl: false
    });

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    window.L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstance.current = map;

    // Al hacer clic en el mapa capturamos las coordenadas
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      
      if (editStartModal.isOpen) {
        setEditStartModal(prev => ({
          ...prev,
          lat: lat.toFixed(5),
          lng: lng.toFixed(5)
        }));
        showAlert("📍 Coordenadas seleccionadas para el Origen.", "info");
      } else {
        setFormCoords({
          lat: lat.toFixed(5),
          lng: lng.toFixed(5)
        });
        showAlert("📍 Coordenadas capturadas para el nuevo punto.", "info");
      }
    });

    drawMapElements();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.off();
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [leafletLoaded, editStartModal.isOpen]);

  // Redibujar elementos al cambiar destinos, origen, o estado de rutas
  useEffect(() => {
    if (mapInstance.current && leafletLoaded) {
      drawMapElements();
    }
  }, [trips, activeTripId, leafletLoaded]);

  // Recalcular el tamaño del mapa cuando cambie la pestaña activa o el viaje activo
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => {
        mapInstance.current.invalidateSize();
      }, 150);
    }
  }, [activeTab, activeTripId]);

  // Ajustar el zoom automático cuando se cambia de viaje para mostrar todo el trayecto
  useEffect(() => {
    if (mapInstance.current && leafletLoaded) {
      const activeRoutes = destinations.filter(d => d.inRoute);
      if (activeRoutes.length > 0) {
        const coordsList = [
          [startingPoint.lat, startingPoint.lng],
          ...activeRoutes.map(d => [d.lat, d.lng])
        ];
        const bounds = window.L.latLngBounds(coordsList);
        mapInstance.current.fitBounds(bounds, { padding: [60, 60] });
      } else {
        mapInstance.current.setView([startingPoint.lat, startingPoint.lng], 10);
      }
    }
  }, [activeTripId, leafletLoaded]);

  // Alertas flotantes
  const [alertMsg, setAlertMsg] = useState(null);
  const showAlert = (message, type = "success") => {
    setAlertMsg({ text: message, type });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Motor de Geolocalización para Destinos (Nominatim)
  const handleGeocodeAddress = async () => {
    if (!addressSearchQuery.trim()) {
      showAlert("Por favor, introduce una dirección o lugar primero.", "error");
      return;
    }

    setIsSearchingAddress(true);
    try {
      const query1 = addressSearchQuery
        .replace(/[‘’]/g, "'")
        .replace(/\s*\([^)]*\)/g, "")
        .trim();

      const query2 = query1.replace(/\b\d{5}\b/g, "").replace(/\s+/g, " ").trim();
      const query3 = query2.replace(/\b\d+\b/g, "").replace(/\s+/g, " ").trim();
      const query4 = query3.replace(/Località\s+/gi, "").trim();

      const searchAttempts = [
        { query: query1, label: "Dirección completa corregida" },
        { query: query2, label: "Sin código postal" },
        { query: query3, label: "Búsqueda por calle y ciudad" },
        { query: query4, label: "Búsqueda simplificada de zona" }
      ];

      let results = [];
      let matchedAttempt = null;

      for (const attempt of searchAttempts) {
        if (!attempt.query) continue;
        
        const queryUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(attempt.query)}&countrycodes=it&limit=1`;
        const response = await fetch(queryUrl, {
          headers: { 'Accept-Language': 'es,it,en' }
        });
        const data = await response.json();
        
        if (data && data.length > 0) {
          results = data;
          matchedAttempt = attempt;
          break;
        }
      }

      if (results && results.length > 0) {
        const place = results[0];
        const latVal = parseFloat(place.lat);
        const lngVal = parseFloat(place.lon);

        setFormCoords({
          lat: latVal.toFixed(5),
          lng: lngVal.toFixed(5)
        });

        if (!formName) {
          const mainName = place.display_name.split(',')[0] || "Lugar Encontrado";
          setFormName(mainName);
        }

        showAlert(`📍 Encontrado mediante: ${matchedAttempt.label}.`);
        setActiveTab("map");
        focusOnLocation(latVal, lngVal);
      } else {
        showAlert("No pudimos encontrar esa dirección. Intenta simplificar el texto o haz clic directo en el mapa.", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Error al conectar con el servidor de búsqueda de direcciones.", "error");
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Motor de Geolocalización para el Origen/Salida
  const handleGeocodeStartPoint = async () => {
    if (!startPointSearchQuery.trim()) {
      showAlert("Por favor, introduce una dirección o ciudad.", "error");
      return;
    }

    setIsSearchingStartPoint(true);
    try {
      const query1 = startPointSearchQuery
        .replace(/[‘’]/g, "'")
        .replace(/\s*\([^)]*\)/g, "")
        .trim();

      const query2 = query1.replace(/\b\d{5}\b/g, "").replace(/\s+/g, " ").trim();
      const query3 = query2.replace(/\b\d+\b/g, "").replace(/\s+/g, " ").trim();

      const searchAttempts = [
        { query: query1, label: "Dirección completa" },
        { query: query2, label: "Sin código postal" },
        { query: query3, label: "Simplificado" }
      ];

      let results = [];

      for (const attempt of searchAttempts) {
        if (!attempt.query) continue;
        const queryUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(attempt.query)}&countrycodes=it&limit=1`;
        const response = await fetch(queryUrl, {
          headers: { 'Accept-Language': 'es,it,en' }
        });
        const data = await response.json();
        
        if (data && data.length > 0) {
          results = data;
          break;
        }
      }

      if (results && results.length > 0) {
        const place = results[0];
        const latVal = parseFloat(place.lat);
        const lngVal = parseFloat(place.lon);

        setEditStartModal(prev => ({
          ...prev,
          name: place.display_name.split(',')[0] || "Mi Origen",
          lat: latVal.toFixed(5),
          lng: lngVal.toFixed(5)
        }));

        showAlert(`📍 Origen localizado correctamente en el mapa.`);
      } else {
        showAlert("No pudimos geolocalizar esa dirección de inicio.", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Error al buscar la dirección del origen.", "error");
    } finally {
      setIsSearchingStartPoint(false);
    }
  };

  // Gestión de creación de viaje nuevo
  const handleCreateTrip = (e) => {
    e.preventDefault();
    if (!newTripModal.name.trim()) {
      showAlert("Por favor, escribe un nombre para tu viaje.", "error");
      return;
    }

    const preset = STARTING_PRESETS[newTripModal.startPresetIndex];
    const newTrip = {
      id: `trip-${Date.now()}`,
      name: newTripModal.name,
      startingPoint: {
        lat: preset.lat,
        lng: preset.lng,
        name: preset.name
      },
      destinations: []
    };

    setTrips(prev => [...prev, newTrip]);
    setActiveTripId(newTrip.id);
    setNewTripModal({ isOpen: false, name: "", startPresetIndex: 0 });
    setActiveTab("map");
    showAlert(`💼 ¡Viaje '${newTrip.name}' creado e iniciado con éxito!`);
    
    setTimeout(() => {
      focusOnLocation(preset.lat, preset.lng, true);
    }, 300);
  };

  // Confirmar eliminación de un viaje completo
  const triggerDeleteTripConfirm = (id, name) => {
    setDeleteTripModal({
      isOpen: true,
      targetId: id,
      targetName: name
    });
  };

  // Realizar el borrado del viaje completo
  const executeDeleteTrip = () => {
    const { targetId, targetName } = deleteTripModal;
    if (trips.length <= 1) {
      showAlert("No puedes eliminar el único viaje disponible.", "error");
      setDeleteTripModal({ isOpen: false, targetId: null, targetName: "" });
      return;
    }

    let nextActiveId = activeTripId;
    if (activeTripId === targetId) {
      const remainingTrips = trips.filter(t => t.id !== targetId);
      nextActiveId = remainingTrips[0].id;
      setActiveTripId(nextActiveId);
    }

    setTrips(prev => prev.filter(t => t.id !== targetId));
    setDeleteTripModal({ isOpen: false, targetId: null, targetName: "" });
    showAlert(`El viaje '${targetName}' ha sido eliminado con éxito.`, "info");
  };

  // Cálculo de desvío lateral para rutas de ida y vuelta paralelas
  const getOffsetLatLng = (p1, p2, offsetMeters = 1500) => {
    const latOffsetDegree = offsetMeters / 111111;
    const lngOffsetDegree = offsetMeters / (111111 * Math.cos((p1.lat + p2.lat) * Math.PI / 360));

    const dy = p2.lat - p1.lat;
    const dx = p2.lng - p1.lng;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) return { p1Offset: p1, p2Offset: p2 };

    const px = -dy / len;
    const py = dx / len;

    return {
      p1Offset: { lat: p1.lat + px * latOffsetDegree, lng: p1.lng + py * lngOffsetDegree },
      p2Offset: { lat: p2.lat + px * latOffsetDegree, lng: p2.lng + py * lngOffsetDegree }
    };
  };

  // Dibujar todos los marcadores y polilíneas en el mapa real
  const drawMapElements = () => {
    const L = window.L;
    const map = mapInstance.current;
    if (!L || !map) return;

    // Limpiar capas anteriores
    mapLayersRef.current.markers.forEach(m => map.removeLayer(m));
    mapLayersRef.current.polylines.forEach(p => map.removeLayer(p));
    mapLayersRef.current.labels.forEach(l => map.removeLayer(l));
    mapLayersRef.current = { markers: [], polylines: [], labels: [] };

    // 1. Dibujar Origen (Punto verde)
    const greenMarkerIcon = L.divIcon({
      className: 'custom-pin-start',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-10 h-10 bg-emerald-500/30 rounded-full animate-ping"></div>
          <div class="w-8 h-8 bg-emerald-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m12 3-1.912 5.886L3.82 9.24l4.59 4.475L7.33 19.6 12 16.5l4.67 3.1-1.08-5.885 4.59-4.475-6.268-.354Z"/></svg>
          </div>
          <div class="absolute -bottom-6 bg-emerald-950 border border-emerald-500/50 text-[9px] text-white px-1.5 py-0.5 rounded font-extrabold whitespace-nowrap shadow-md">
            ORIGEN: ${startingPoint.name.split(" ")[0]}
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const startMarker = L.marker([startingPoint.lat, startingPoint.lng], { icon: greenMarkerIcon })
      .addTo(map)
      .bindPopup(`
        <div class="p-2 font-sans text-slate-200">
          <span class="bg-emerald-950 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-800">Punto de Origen</span>
          <h4 class="font-bold text-slate-100 text-sm mt-1.5">${startingPoint.name}</h4>
          <p class="text-xs text-slate-400 mt-1">Coordenadas: ${startingPoint.lat.toFixed(4)}, ${startingPoint.lng.toFixed(4)}</p>
        </div>
      `);
    mapLayersRef.current.markers.push(startMarker);

    // 2. Dibujar Destinos
    destinations.forEach((dest) => {
      const borderClass = dest.inRoute ? 'border-amber-500' : 'border-sky-400';
      const badgeColor = dest.inRoute ? 'bg-rose-600' : 'bg-sky-600';
      const badgeIcon = dest.inRoute ? '📍' : '🔍';

      const destIcon = L.divIcon({
        className: 'custom-pin-dest',
        html: `
          <div class="relative flex items-center justify-center font-sans">
            <div class="w-10 h-10 border-2 ${borderClass} rounded-full overflow-hidden shadow-lg transition-transform hover:scale-110 duration-200 bg-slate-800">
              <img src="${dest.photoUrl}" class="w-full h-full object-cover" />
            </div>
            <div class="absolute -top-1 -right-1 w-5 h-5 ${badgeColor} text-white border-2 border-white text-[9px] rounded-full flex items-center justify-center font-bold shadow-md">
              ${badgeIcon}
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const popupContent = `
        <div class="w-64 overflow-hidden rounded-lg font-sans">
          <img src="${dest.photoUrl}" class="w-full h-32 object-cover m-0" />
          <div class="p-3">
            <div class="flex items-center justify-between gap-1 mb-1">
              <h3 class="font-bold text-white text-base m-0 truncate">${dest.name}</h3>
              <span class="text-[9px] font-bold px-2 py-0.5 rounded ${dest.inRoute ? (dest.isRoundTrip ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50' : 'bg-blue-950/80 text-blue-300 border border-blue-700/50') : 'bg-slate-800 text-slate-300 border border-slate-700'}">
                ${dest.inRoute ? (dest.isRoundTrip ? '🔄 Ida/Vuelta' : '➡️ Solo Ida') : '🔍 Exploración (Libre)'}
              </span>
            </div>
            <p class="text-xs text-slate-300 my-2 leading-relaxed" style="margin: 8px 0;">${dest.description}</p>
            
            ${dest.inRoute ? `
              <div class="flex items-center gap-1.5 text-xs text-slate-200 bg-slate-900/80 p-2 rounded border border-slate-800 mt-2">
                <span class="font-medium text-slate-400">⏱️ Duración:</span>
                <span class="text-amber-400 font-extrabold">${dest.duration}</span>
              </div>
            ` : `
              <div class="text-[10px] text-sky-400 font-semibold bg-sky-950/30 border border-sky-900/50 p-2 rounded text-center mt-2">
                Punto libre. Puedes añadirlo a la ruta activa desde el menú lateral.
              </div>
            `}
          </div>
        </div>
      `;

      const marker = L.marker([dest.lat, dest.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(popupContent, { maxWidth: 280, padding: 0 });

      mapLayersRef.current.markers.push(marker);

      if (!dest.inRoute) return;

      const pStart = { lat: startingPoint.lat, lng: startingPoint.lng };
      const pDest = { lat: dest.lat, lng: dest.lng };

      if (dest.isRoundTrip) {
        // Rutas paralelas
        const { p1Offset, p2Offset } = getOffsetLatLng(pStart, pDest, 1000);
        const { p1Offset: p1Return, p2Offset: p2Return } = getOffsetLatLng(pDest, pStart, 1000);

        // Ida (Azul)
        const polylineIda = L.polyline([p1Offset, p2Offset], {
          color: '#3b82f6',
          weight: 4.5,
          opacity: 0.9,
          lineCap: 'round'
        }).addTo(map);
        mapLayersRef.current.polylines.push(polylineIda);

        // Vuelta (Morado discontinuo)
        const polylineVuelta = L.polyline([p1Return, p2Return], {
          color: '#a855f7',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8',
          lineCap: 'round'
        }).addTo(map);
        mapLayersRef.current.polylines.push(polylineVuelta);

        // Etiqueta de tiempo
        const midLat = (p1Offset.lat + p2Offset.lat) / 2;
        const midLng = (p1Offset.lng + p2Offset.lng) / 2;

        const timeLabel = L.divIcon({
          className: 'custom-time-label',
          html: `
            <div class="flex items-center gap-1 bg-slate-950 text-slate-200 border-2 border-indigo-500 px-2.5 py-1 rounded-full shadow-lg text-[10px] font-bold whitespace-nowrap">
              <span class="text-indigo-400">🔄</span>
              <span>Ida y Vuelta: ${dest.duration}</span>
            </div>
          `,
          iconAnchor: [65, 12]
        });

        const labelMarker = L.marker([midLat, midLng], { icon: timeLabel }).addTo(map);
        mapLayersRef.current.labels.push(labelMarker);

      } else {
        // Solo ida (Verde)
        const polylineSoloIda = L.polyline([pStart, pDest], {
          color: '#10b981',
          weight: 4.5,
          opacity: 0.9,
          lineCap: 'round'
        }).addTo(map);
        mapLayersRef.current.polylines.push(polylineSoloIda);

        // Etiqueta de tiempo
        const midLat = (pStart.lat + pDest.lat) / 2;
        const midLng = (pStart.lng + pDest.lng) / 2;

        const timeLabel = L.divIcon({
          className: 'custom-time-label',
          html: `
            <div class="flex items-center gap-1 bg-slate-950 text-slate-200 border-2 border-emerald-500 px-2.5 py-1 rounded-full shadow-lg text-[10px] font-bold whitespace-nowrap">
              <span class="text-emerald-400">➡️</span>
              <span>Ida: ${dest.duration}</span>
            </div>
          `,
          iconAnchor: [55, 12]
        });

        const labelMarker = L.marker([midLat, midLng], { icon: timeLabel }).addTo(map);
        mapLayersRef.current.labels.push(labelMarker);
      }
    });
  };

  // Conectar / Desconectar punto de la ruta activa
  const toggleInRoute = (id) => {
    const updatedDestinations = destinations.map(d => {
      if (d.id === id) {
        const updatedInRoute = !d.inRoute;
        showAlert(
          updatedInRoute 
            ? `📍 '${d.name}' se ha conectado a la ruta activa.`
            : `🔍 '${d.name}' ahora se muestra como punto libre en el mapa.`,
          updatedInRoute ? "success" : "info"
        );
        return { ...d, inRoute: updatedInRoute };
      }
      return d;
    });
    updateActiveTrip({ destinations: updatedDestinations });
  };

  // Abrir modal para editar el punto de partida
  const openEditStartModal = () => {
    setEditStartModal({
      isOpen: true,
      name: startingPoint.name,
      lat: startingPoint.lat.toString(),
      lng: startingPoint.lng.toString()
    });
    setStartPointSearchQuery("");
  };

  // Guardar cambios del punto de partida
  const handleSaveStartPoint = (e) => {
    e.preventDefault();
    const latNum = parseFloat(editStartModal.lat);
    const lngNum = parseFloat(editStartModal.lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      showAlert("Por favor, introduce coordenadas de latitud y longitud válidas.", "error");
      return;
    }

    updateActiveTrip({
      startingPoint: {
        name: editStartModal.name || "Punto de Partida",
        lat: latNum,
        lng: lngNum
      }
    });

    setEditStartModal(prev => ({ ...prev, isOpen: false }));
    showAlert("📍 Origen de este viaje actualizado con éxito.");
    
    setActiveTab("map");
    focusOnLocation(latNum, lngNum, true);
  };

  // Seleccionar preset de ciudad de inicio rápida
  const handleSelectStartPreset = (preset) => {
    setEditStartModal({
      isOpen: true,
      name: preset.name,
      lat: preset.lat.toString(),
      lng: preset.lng.toString()
    });
    showAlert(`Coordenadas cargadas para ${preset.name}.`);
  };

  // Agregar destino nuevo
  const handleAddDestination = (e) => {
    e.preventDefault();

    if (!formName) {
      showAlert("Por favor, introduce un nombre para el destino.", "error");
      return;
    }
    if (!formCoords.lat || !formCoords.lng) {
      showAlert("Por favor, selecciona una posición en el mapa o busca una dirección antes de guardar.", "error");
      setActiveTab("map");
      return;
    }

    const newDest = {
      id: Date.now().toString(),
      name: formName,
      description: formDescription || "Punto de exploración guardado en el mapa de la Toscana.",
      photoUrl: formPhotoUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800',
      duration: formDuration || "1h",
      isRoundTrip: formIsRoundTrip,
      inRoute: formInRoute, 
      lat: parseFloat(formCoords.lat),
      lng: parseFloat(formCoords.lng)
    };

    updateActiveTrip({ destinations: [...destinations, newDest] });

    // Resetear formulario
    setFormName("");
    setFormDescription("");
    setFormPhotoUrl("");
    setFormDuration("");
    setFormIsRoundTrip(false);
    setFormInRoute(true);
    setFormCoords({ lat: "", lng: "" });
    setAddressSearchQuery("");
    
    setActiveTab("map");

    showAlert(
      newDest.inRoute 
        ? `🚀 ¡Añadida la parada hacia ${newDest.name}!` 
        : `🔍 ¡Lugar '${newDest.name}' guardado como Punto Libre!`
    );

    if (mapInstance.current) {
      setTimeout(() => {
        if (newDest.inRoute) {
          const bounds = window.L.latLngBounds([
            [startingPoint.lat, startingPoint.lng],
            [newDest.lat, newDest.lng]
          ]);
          mapInstance.current.fitBounds(bounds, { padding: [60, 60] });
        } else {
          focusOnLocation(newDest.lat, newDest.lng);
        }
      }, 300);
    }
  };

  // Confirmar eliminación de destino
  const triggerDeleteConfirm = (id, name) => {
    setDeleteModal({
      isOpen: true,
      targetId: id,
      targetName: name
    });
  };

  const executeDelete = () => {
    const { targetId } = deleteModal;
    const filtered = destinations.filter(d => d.id !== targetId);
    updateActiveTrip({ destinations: filtered });
    setDeleteModal({ isOpen: false, targetId: null, targetName: "" });
    showAlert(`Se ha eliminado la parada del viaje actual.`, "info");
  };

  const focusOnLocation = (lat, lng, isStart = false) => {
    if (mapInstance.current) {
      mapInstance.current.setView([lat, lng], isStart ? 11 : 12, {
        animate: true,
        duration: 1.2
      });
    }
  };

  const selectPresetImage = (url) => {
    setFormPhotoUrl(url);
    showAlert("Foto toscana seleccionada.");
  };

  // Filtrar destinos
  const routeDestinations = destinations.filter(d => d.inRoute);
  const standalonePoints = destinations.filter(d => !d.inRoute);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans relative">
      
      {/* Alertas Flotantes */}
      {alertMsg && (
        <div className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 z-[9999] max-w-sm p-4 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 flex items-center gap-3 ${
          alertMsg.type === 'error' 
            ? 'bg-rose-950/95 border-rose-500 text-rose-200' 
            : alertMsg.type === 'info'
            ? 'bg-slate-900/95 border-sky-500 text-sky-200'
            : 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
        }`}>
          <div className="flex-1 text-xs md:text-sm font-semibold text-left">{alertMsg.text}</div>
          <button onClick={() => setAlertMsg(null)} className="text-xs opacity-75 hover:opacity-100 font-bold p-1">✕</button>
        </div>
      )}

      {/* MODAL 1: EDITAR PUNTO DE PARTIDA (ORIGEN) */}
      {editStartModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-5 md:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <MapPin className="w-5 h-5" />
                <h3 className="font-bold text-base md:text-lg text-white">Modificar Origen</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditStartModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-left">
              {/* Buscador de dirección de partida */}
              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buscar Origen por Dirección</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={startPointSearchQuery}
                    onChange={e => setStartPointSearchQuery(e.target.value)}
                    placeholder="Ej. Aeropuerto de Pisa, Hotel Florencia..."
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={handleGeocodeStartPoint}
                    disabled={isSearchingStartPoint}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold px-3 py-2 rounded-lg text-xs transition flex items-center gap-1.5 shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    {isSearchingStartPoint ? '...' : 'Buscar'}
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveStartPoint} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre de Salida</label>
                  <input 
                    type="text" 
                    value={editStartModal.name}
                    onChange={e => setEditStartModal({ ...editStartModal, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition"
                    placeholder="Ej. Hotel Villa Florencia"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Latitud</label>
                    <input 
                      type="text" 
                      value={editStartModal.lat}
                      onChange={e => setEditStartModal({ ...editStartModal, lat: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none transition"
                      placeholder="Latitud"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Longitud</label>
                    <input 
                      type="text" 
                      value={editStartModal.lng}
                      onChange={e => setEditStartModal({ ...editStartModal, lng: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none transition"
                      placeholder="Longitud"
                      required
                    />
                  </div>
                </div>

                {/* Presets Rápidos */}
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase mb-2">Comienzo Rápido:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {STARTING_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleSelectStartPreset(preset)}
                        className="text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 py-2 px-2 rounded-lg text-left truncate transition"
                      >
                        📍 {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditStartModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-sm transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-1"
                  >
                    <Check className="w-4 h-4" /> Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMACIÓN DE ELIMINACIÓN DE DESTINO */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/15 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-500/35">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5 text-left">
              <h3 className="font-bold text-lg text-white text-center">¿Eliminar localización?</h3>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed text-center">
                Quitarás de forma definitiva a <strong className="text-slate-200">"{deleteModal.targetName}"</strong> de tu mapa e itinerario.
              </p>
            </div>

            <div className="flex gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, targetId: null, targetName: "" })}
                className="flex-1 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition h-11"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition h-11"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREAR NUEVO VIAJE */}
      {newTripModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-5 md:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Compass className="w-5 h-5" />
                <h3 className="font-bold text-base md:text-lg text-white">Crear Nuevo Viaje</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setNewTripModal({ isOpen: false, name: "", startPresetIndex: 0 })}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre del Viaje</label>
                <input 
                  type="text" 
                  value={newTripModal.name}
                  onChange={e => setNewTripModal({ ...newTripModal, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition"
                  placeholder="Ej. Mi Aventura de Primavera 2026"
                  required
                />
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase mb-2">Punto de Partida Inicial:</span>
                <div className="grid grid-cols-2 gap-2">
                  {STARTING_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setNewTripModal({ ...newTripModal, startPresetIndex: idx })}
                      className={`text-[11px] font-semibold py-2 px-2.5 rounded-lg border text-left truncate transition ${
                        newTripModal.startPresetIndex === idx 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500' 
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-850 hover:border-slate-700'
                      }`}
                    >
                      📍 {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewTripModal({ isOpen: false, name: "", startPresetIndex: 0 })}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4 stroke-[3]" /> Crear Viaje
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMACIÓN DE ELIMINACIÓN DE VIAJE */}
      {deleteTripModal.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/15 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-500/35">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5 text-left">
              <h3 className="font-bold text-lg text-white text-center">¿Eliminar Viaje Completo?</h3>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed text-center">
                Estás a punto de borrar de forma definitiva el viaje <strong className="text-slate-200">"{deleteTripModal.targetName}"</strong>. Esto eliminará su punto de origen, todas sus rutas y puntos de interés libres guardados.
              </p>
            </div>

            <div className="flex gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeleteTripModal({ isOpen: false, targetId: null, targetName: "" })}
                className="flex-1 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition h-11"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDeleteTrip}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition h-11"
              >
                Eliminar Viaje
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL LATERAL DE CONTROL (Sidebar) */}
      <aside className={`
        w-full lg:w-[450px] flex flex-col bg-slate-950 border-r border-slate-800 shadow-2xl shrink-0 z-30
        ${activeTab === 'map' ? 'hidden lg:flex' : 'flex'}
        absolute lg:relative inset-x-0 top-0 bottom-[64px] lg:bottom-0 lg:h-full
      `}>
        
        {/* Cabecera Premium */}
        <div className="p-4 md:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 relative shrink-0 text-left">
          <div className="absolute top-2 right-2 flex gap-1">
            <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
              <Compass className="w-3 h-3 animate-spin" /> Toscana Pro
            </span>
          </div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-lg shrink-0">
              <Route className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
                Rutas de la Toscana
              </h1>
              <p className="text-[10px] md:text-xs text-slate-400">Diseñador Profesional de Viajes</p>
            </div>
          </div>
        </div>

        {/* --- NUEVO GESTOR DE VIAJES MULTI-RUTA --- */}
        <div className="px-4 md:px-6 py-3.5 bg-slate-900 border-b border-slate-800 space-y-3 shrink-0 text-left">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Viaje Activo</label>
            <div className="flex gap-1.5">
              <button
                onClick={() => setNewTripModal({ isOpen: true, name: "", startPresetIndex: 0 })}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded transition"
              >
                <Plus className="w-3 h-3" /> Nuevo
              </button>
              {trips.length > 1 && (
                <button
                  onClick={() => triggerDeleteTripConfirm(activeTripId, activeTrip.name)}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded transition"
                >
                  <Trash2 className="w-3 h-3" /> Borrar
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={activeTripId}
              onChange={(e) => setActiveTripId(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm focus:border-amber-500 outline-none cursor-pointer transition"
            >
              {trips.map(trip => (
                <option key={trip.id} value={trip.id}>
                  💼 {trip.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Punto de Partida Actual */}
        <div className="px-4 md:px-6 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Origen de Salida:</p>
              <h3 className="text-xs font-bold text-slate-100 truncate">{startingPoint.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={openEditStartModal}
              title="Modificar origen"
              className="p-2 bg-slate-800 hover:bg-emerald-950/80 rounded-lg text-slate-300 hover:text-emerald-400 border border-slate-700 hover:border-emerald-800 transition min-h-[38px] min-w-[38px]"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => {
                setActiveTab("map");
                focusOnLocation(startingPoint.lat, startingPoint.lng, true);
              }}
              title="Centrar en mapa"
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition min-h-[38px] min-w-[38px]"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="px-4 md:px-6 py-2.5 bg-slate-900/20 grid grid-cols-3 gap-2 border-b border-slate-800 text-center shrink-0">
          <div className="bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/60">
            <div className="text-[9px] md:text-xs text-slate-400">En Ruta</div>
            <div className="text-sm md:text-lg font-black text-amber-400">{routeDestinations.length}</div>
          </div>
          <div className="bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/60">
            <div className="text-[9px] md:text-xs text-slate-400">Sugeridos</div>
            <div className="text-sm md:text-lg font-black text-sky-400">{standalonePoints.length}</div>
          </div>
          <div className="bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/60">
            <div className="text-[9px] md:text-xs text-slate-400 font-medium">Puntos</div>
            <div className="text-sm md:text-lg font-black text-emerald-400">{destinations.length + 1}</div>
          </div>
        </div>

        {/* Selector de Pestañas (Desktop) */}
        <div className="hidden lg:flex border-b border-slate-800 bg-slate-950 shrink-0">
          <button 
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'list' || activeTab === 'map' ? 'border-b-2 border-amber-500 bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Mis Destinos
          </button>
          <button 
            onClick={() => setActiveTab("add")}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'add' ? 'border-b-2 border-amber-500 bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Parada
          </button>
          <button 
            onClick={() => setActiveTab("presets")}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'presets' ? 'border-b-2 border-amber-500 bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Image className="w-3.5 h-3.5" />
            Fotos Galería
          </button>
        </div>

        {/* CONTENIDOS DINÁMICOS DEL PANEL */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          
          {/* PESTAÑA A: ITINERARIO / MIS DESTINOS */}
          {(activeTab === "list" || activeTab === "map") && (
            <div className="space-y-6">
              
              {/* Sección Ruta Activa */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-left">
                  <h3 className="text-xs font-black tracking-wider text-amber-500 uppercase flex items-center gap-1.5">
                    <Route className="w-4 h-4" /> Ruta de Viaje ({routeDestinations.length})
                  </h3>
                  <span className="text-[10px] text-slate-500">Dibujan trazo</span>
                </div>

                {routeDestinations.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center bg-slate-900/20 rounded-xl border border-slate-800/40">Ningún punto conectado. Utiliza los botones de conexión rápida de abajo o haz clic en el mapa.</p>
                ) : (
                  <div className="space-y-2.5">
                    {routeDestinations.map((dest, index) => (
                      <div 
                        key={dest.id}
                        onClick={() => {
                          if (window.innerWidth < 1024) setActiveTab("map");
                          focusOnLocation(dest.lat, dest.lng);
                        }}
                        className="group relative bg-slate-900/80 hover:bg-slate-900 border border-amber-500/20 hover:border-amber-500/40 p-3 rounded-xl flex gap-3 cursor-pointer transition duration-200"
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-800 border border-slate-700 relative">
                          <img src={dest.photoUrl} alt={dest.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                          <span className="absolute bottom-0 right-0 bg-slate-950/80 text-[9px] text-amber-400 font-extrabold px-1.5 py-0.5 rounded-tl-md">
                            #{index + 1}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 pr-12 text-left">
                          <h4 className="font-bold text-sm text-white group-hover:text-amber-400 truncate transition">
                            {dest.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 leading-relaxed">
                            {dest.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-slate-400">
                            <span className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                              <Clock className="w-3 h-3" /> {dest.duration}
                            </span>
                            <span className="text-indigo-400">
                              {dest.isRoundTrip ? '🔄 Ida/Vuelta' : '➡️ Solo Ida'}
                            </span>
                          </div>
                        </div>

                        {/* Controles de Acción Lateral */}
                        <div className="absolute right-2 top-2 bottom-2 flex flex-col justify-between items-end">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerDeleteConfirm(dest.id, dest.name);
                            }}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition min-h-[32px] min-w-[32px]"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleInRoute(dest.id);
                            }}
                            className="p-2 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/20 rounded-lg transition min-h-[32px] min-w-[32px]"
                            title="Desconectar de ruta"
                          >
                            <Link2Off className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección Puntos Libres */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-left">
                  <h3 className="text-xs font-black tracking-wider text-sky-400 uppercase flex items-center gap-1.5">
                    <MapIcon className="w-4 h-4" /> Puntos Libres o Sugeridos ({standalonePoints.length})
                  </h3>
                  <span className="text-[10px] text-slate-500">Solo chinchetas</span>
                </div>

                {standalonePoints.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center bg-slate-900/20 rounded-xl border border-slate-800/40">No tienes puntos libres creados en el mapa.</p>
                ) : (
                  <div className="space-y-2.5">
                    {standalonePoints.map((dest) => (
                      <div 
                        key={dest.id}
                        onClick={() => {
                          if (window.innerWidth < 1024) setActiveTab("map");
                          focusOnLocation(dest.lat, dest.lng);
                        }}
                        className="group relative bg-slate-900/40 hover:bg-slate-900/70 border border-sky-500/10 hover:border-sky-500/30 p-3 rounded-xl flex gap-3 cursor-pointer transition duration-200"
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-800 border border-slate-700 relative opacity-85">
                          <img src={dest.photoUrl} alt={dest.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                          <span className="absolute top-1 left-1 bg-sky-950/90 text-[8px] text-sky-400 font-extrabold px-1 py-0.5 rounded shadow-sm border border-sky-500/20">
                            POI
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 pr-12 text-left">
                          <h4 className="font-bold text-sm text-slate-300 group-hover:text-sky-400 truncate transition">
                            {dest.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 leading-relaxed">
                            {dest.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                            <span>Lat: {dest.lat.toFixed(3)}</span>
                            <span>Lng: {dest.lng.toFixed(3)}</span>
                          </div>
                        </div>

                        {/* Controles de Acción Lateral */}
                        <div className="absolute right-2 top-2 bottom-2 flex flex-col justify-between items-end">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerDeleteConfirm(dest.id, dest.name);
                            }}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition min-h-[32px] min-w-[32px]"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleInRoute(dest.id);
                            }}
                            className="p-2 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-slate-950 border border-sky-500/20 rounded-lg transition min-h-[32px] min-w-[32px]"
                            title="Conectar a ruta"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* PESTAÑA B: REGISTRAR NUEVA PARADA */}
          {activeTab === "add" && (
            <div className="space-y-4 text-left">
              
              {/* Buscador de Direcciones */}
              <div className="p-4 bg-slate-900 border border-slate-850 rounded-xl space-y-3 shadow-inner text-left">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Search className="w-4 h-4" /> Buscar Dirección en la Toscana (Buscador Inteligente)
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={addressSearchQuery}
                    onChange={e => setAddressSearchQuery(e.target.value)}
                    placeholder="Ej. Località Sant’Uberto 164, Castagneto Carducci..."
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={handleGeocodeAddress}
                    disabled={isSearchingAddress}
                    className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 font-extrabold px-3 py-2.5 rounded-xl text-xs transition flex items-center gap-1 shrink-0"
                  >
                    {isSearchingAddress ? '...' : 'Buscar'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  💡 <strong>¡Soporta direcciones complejas!</strong> Corregirá automáticamente apóstrofes, omitirá códigos provinciales y números si causan fallos para garantizar que la chincheta aparezca en el mapa.
                </p>
              </div>

              <form onSubmit={handleAddDestination} className="space-y-4">
                {/* Coordenadas capturadas */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Latitud fijada</label>
                    <input 
                      type="text" 
                      value={formCoords.lat} 
                      onChange={e => setFormCoords({ ...formCoords, lat: e.target.value })}
                      placeholder="Latitud de destino" 
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Longitud fijada</label>
                    <input 
                      type="text" 
                      value={formCoords.lng} 
                      onChange={e => setFormCoords({ ...formCoords, lng: e.target.value })}
                      placeholder="Longitud de destino" 
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 my-4 pt-4 space-y-4">
                  
                  {/* Selector de modo: Ruta vs Libre */}
                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                    <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">¿Vincular a la Ruta Activa?</span>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setFormInRoute(true)}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 h-11 ${
                          formInRoute 
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500' 
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <Route className="w-3.5 h-3.5" /> En Ruta
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormInRoute(false)}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 h-11 ${
                          !formInRoute 
                            ? 'bg-sky-500/20 text-sky-400 border-sky-500' 
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <MapIcon className="w-3.5 h-3.5" /> Punto Libre
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre del Lugar</label>
                    <input 
                      type="text" 
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="Ej. Castillo en Siena, Bodega en Chianti..."
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-white outline-none transition h-11"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descripción o Notas de viaje</label>
                    <textarea 
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                      rows="3"
                      placeholder="¿Qué visitar? ¿Dónde comer? Notas para el viaje..."
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-white outline-none transition resize-none"
                    />
                  </div>

                  {formInRoute && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tiempo de Viaje</label>
                          <input 
                            type="text" 
                            value={formDuration}
                            onChange={e => setFormDuration(e.target.value)}
                            placeholder="Ej. 1h 30m, 50 min"
                            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs md:text-sm text-white outline-none transition h-11"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Imagen (URL)</label>
                          <input 
                            type="text" 
                            value={formPhotoUrl}
                            onChange={e => setFormPhotoUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs md:text-sm text-white outline-none transition h-11"
                          />
                        </div>
                      </div>

                      <div 
                        onClick={() => setFormIsRoundTrip(!formIsRoundTrip)}
                        className="p-3 bg-slate-900 hover:bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition select-none h-12"
                      >
                        <div className="flex items-center gap-2">
                          <RotateCcw className={`w-4 h-4 ${formIsRoundTrip ? 'text-indigo-400' : 'text-slate-500'}`} />
                          <div>
                            <div className="text-[11px] md:text-xs font-bold text-slate-200">¿Es ruta de Ida y Vuelta?</div>
                          </div>
                        </div>
                        <div className={`w-9 h-5 rounded-full p-0.5 transition ${formIsRoundTrip ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform transform ${formIsRoundTrip ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!formInRoute && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Enlace de Foto (URL)</label>
                      <input 
                        type="text" 
                        value={formPhotoUrl}
                        onChange={e => setFormPhotoUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs md:text-sm text-white outline-none transition h-11"
                      />
                    </div>
                  )}

                  {/* Guardar destino */}
                  <button
                    type="submit"
                    className={`w-full bg-gradient-to-r font-extrabold py-3.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition flex items-center justify-center gap-2 h-12 text-xs md:text-sm ${
                      formInRoute 
                        ? 'from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 hover:shadow-amber-500/20' 
                        : 'from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 hover:shadow-sky-500/20'
                    }`}
                  >
                    <Plus className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" /> Registrar {formInRoute ? 'Parada y Trazar Ruta' : 'Punto Libre'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PESTAÑA C: GALERÍA DE PRESETS */}
          {activeTab === "presets" && (
            <div className="space-y-4 text-left">
              <div>
                <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-1">Galería Toscana</h3>
                <p className="text-xs text-slate-500">Pulsa sobre una foto representativa para aplicarla automáticamente a tu próximo destino.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {TOSCANA_PRESET_IMAGES.map((preset) => (
                  <div 
                    key={preset.name}
                    onClick={() => selectPresetImage(preset.url)}
                    className={`group cursor-pointer rounded-xl overflow-hidden border-2 bg-slate-900 relative aspect-video transition ${
                      formPhotoUrl === preset.url ? 'border-amber-400' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5 md:p-2 text-left">
                      <p className="text-[9px] md:text-[10px] font-bold text-white truncate">{preset.name}</p>
                    </div>
                    {formPhotoUrl === preset.url && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                        ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Pie de página */}
        <div className="hidden lg:flex p-4 border-t border-slate-900 bg-slate-950 text-center text-[11px] text-slate-600 items-center justify-center gap-1 shrink-0">
          <span>Toscana Navigator 2026</span>
          <Award className="w-3.5 h-3.5 text-amber-500" />
        </div>
      </aside>

      {/* ÁREA DEL MAPA */}
      <main className={`
        flex-1 h-full relative bg-slate-900
        ${activeTab !== 'map' ? 'hidden lg:block' : 'block'}
        absolute lg:relative inset-0 bottom-[64px] lg:bottom-0
      `}>
        
        {/* Banner de Instrucción del mapa */}
        <div className="absolute top-4 left-4 right-4 md:right-auto z-20 pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 text-slate-200 p-3 rounded-xl shadow-xl flex gap-3 pointer-events-auto max-w-sm">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h4 className="text-[11px] md:text-xs font-bold text-amber-400">Guía de Navegación</h4>
              <p className="text-[10px] md:text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {editStartModal.isOpen 
                  ? "Modo Origen: Pulsa en el mapa o usa el buscador de dirección."
                  : "Modo Destino: Toca el mapa en la Toscana o busca la dirección arriba."}
              </p>
            </div>
          </div>
        </div>

        {/* Leyenda flotante reducida */}
        <div className="absolute bottom-4 left-4 z-20 bg-slate-950/95 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl shadow-xl space-y-1 text-[10px] md:text-xs text-left max-w-[180px] md:max-w-none">
          <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1 text-[9px] tracking-wider uppercase">Elementos</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-rose-600 rounded-full inline-block"></span>
            <span className="text-slate-400 font-medium">📍 Parada Activa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-sky-600 rounded-full inline-block"></span>
            <span className="text-slate-400 font-medium">🔍 Punto Libre</span>
          </div>
        </div>

        {/* Contenedor del Mapa Leaflet */}
        <div 
          ref={mapRef} 
          className="w-full h-full"
          style={{ minHeight: '100%' }}
        />

        {/* Pantalla de Carga */}
        {!leafletLoaded && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-50">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium text-xs md:text-sm">Cargando carreteras de la Toscana...</p>
          </div>
        )}
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR (Móviles/Tablets `lg:hidden`) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-[64px] bg-slate-950 border-t border-slate-800/80 grid grid-cols-4 z-40">
        <button 
          onClick={() => setActiveTab("map")}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${activeTab === 'map' ? 'text-amber-400 bg-slate-900/40' : 'text-slate-400'}`}
        >
          <MapIcon className="w-5 h-5" />
          <span>Mapa</span>
        </button>
        <button 
          onClick={() => setActiveTab("list")}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${activeTab === 'list' ? 'text-amber-400 bg-slate-900/40' : 'text-slate-400'}`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Itinerario</span>
        </button>
        <button 
          onClick={() => setActiveTab("add")}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${activeTab === 'add' ? 'text-amber-400 bg-slate-900/40' : 'text-slate-400'}`}
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ Parada</span>
        </button>
        <button 
          onClick={() => setActiveTab("presets")}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${activeTab === 'presets' ? 'text-amber-400 bg-slate-900/40' : 'text-slate-400'}`}
        >
          <Image className="w-5 h-5" />
          <span>Galería</span>
        </button>
      </nav>

      {/* Estilos CSS Globales e Inyecciones Leaflet */}
      <style>{`
        /* Ventanas flotantes Leaflet Estilo Nocturno Premium */
        .leaflet-popup-content-wrapper {
          background-color: #020617 !important; /* slate-950 */
          color: #f1f5f9 !important; /* slate-100 */
          border: 1px solid #1e293b !important; /* slate-800 */
          border-radius: 12px !important;
          padding: 0 !important;
          overflow: hidden !important;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          line-height: inherit !important;
        }
        .leaflet-popup-tip {
          background-color: #020617 !important;
          border: 1px solid #1e293b !important;
        }
        .leaflet-container a.leaflet-popup-close-button {
          color: #ffffff !important;
          padding: 8px !important;
          font-size: 16px !important;
          font-weight: bold;
        }
        /* Ajuste de controles zoom para no estorbar en móviles */
        @media (max-width: 1023px) {
          .leaflet-bottom.leaflet-right {
            bottom: 12px !important;
          }
        }
        /* Sombras para caminos en 2D */
        .leaflet-interactive {
          filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.45));
        }
        /* Transición simple para elementos de lista */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>

    </div>
  );
}