// Objeto de mapa Leaflet
var map = L.map("mapaid").setView([9.5, -84], 8);

// Capa base Positron de Carto
carto_positron = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  }
).addTo(map);

// Capa base de OSM Mapnik
var osm_mapnik = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
});

// Capa base de ESRI World Imagery
var esri_imagery = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  }
);

// Objeto con capas base
var capasBase = {
  Positron: carto_positron,
  OSM: osm_mapnik,
  "ESRI World Imagery": esri_imagery,
};

// Control de capas
var control_capas = L.control
  .layers(capasBase, null, { collapsed: false })
  .addTo(map);

// Control de escala
L.control.scale().addTo(map);

// Capa WMS de Humedales
var acons = L.tileLayer
  .wms("https://geos1pne.sirefor.go.cr/wms?", {
    layers: "registro_nacional_humedales",
    format: "image/png",
    transparent: true,
  })
  .addTo(map);

// Se agrega al control de capas como una capa de tipo "overlay"
control_capas.addOverlay(acons, "Humedales");

// Capa WMS de zonas inundables
var zonas = L.tileLayer
  .wms("http://mapas.cne.go.cr/servicios/cne/wms", {
    layers: "inundaciones",
    format: "image/png",
    transparent: true,
  })
  .addTo(map);

// Se agrega al control de capas como una capa de tipo "overlay"
control_capas.addOverlay(zonas, "Zonas inundables en Costa Rica");

// Capa vectorial de puntos de incidencias
$.getJSON("datos/provincias.geojson", function (geodata) {
  var capa_provincias = L.geoJson(geodata, {
    style: function (feature) {
      return { color: "green", weight: 2.5, fillOpacity: 0.0 };
    },
    onEachFeature: function (feature, layer) {
      var popupText =
        "<strong>Provincia</strong>: " +
        feature.properties.PROVINCIA +
        "<br>" +
        "<strong>Total de reportes de  incidentes</strong>: " +
        feature.properties.SUMA;
      layer.bindPopup(popupText);
    },
  }).addTo(map);

  control_capas.addOverlay(capa_provincias, "Provincias de Costa Rica");
});

// Definición de la capa de puntos antes de su uso
var capa_PNTS_CR;

// Segunda capa vectorial
$.getJSON("datos/PNTS_CR.geojson", function (geodata) {
  var aerodromoIcon = L.divIcon({
    html: '<i class="fa-solid fa-triangle-exclamation" style="color: black; font-size: 14px;"></i>',
    iconSize: [20, 20], // Dimensiones del ícono
    iconAnchor: [10, 10], // Punto central del ícono
    className: "myDivIcon", // Clase personalizada para más estilos si es necesario
  });

  capa_PNTS_CR = L.geoJson(geodata, {
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, { icon: aerodromoIcon });
    },
    style: function (feature) {
      return { color: "green", weight: 2.5, fillOpacity: 0.0 };
    },
    onEachFeature: function (feature, layer) {
      var popupText =
        "<strong>Distrito</strong>: " +
        feature.properties.distrito +
        "<br>" +
        "<strong>Incidente</strong>: " +
        feature.properties.incidentes;
      layer.bindPopup(popupText);
    },
  }).addTo(map);

  control_capas.addOverlay(
    capa_PNTS_CR,
    "Reportes individuales de incidencias"
  );

  // Capa de puntos agrupados
  var capa_registros_agrupados = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
  });
  capa_registros_agrupados.addLayer(capa_PNTS_CR);

  // Se añade la capa al mapa y al control de capas
  capa_registros_agrupados.addTo(map);
  control_capas.addOverlay(
    capa_registros_agrupados,
    "Registros agrupados de incidencias"
  );
});

// Capa de coropletas reporte de incidencias por provincia
$.getJSON("datos/provincias.geojson", function (geojson) {
  var capa_provincias = L.choropleth(geojson, {
    valueProperty: "SUMA",
    scale: ["#ffffb2", "#bd0026"],
    steps: 5,
    mode: "q",
    style: {
      color: "#fff",
      weight: 2,
      fillOpacity: 0.7,
    },
    onEachFeature: function (feature, layer) {
      layer.bindPopup(
        "Provincia: " +
          feature.properties.PROVINCIA +
          "<br>" +
          "Reportes de incidencias por provincia: " +
          feature.properties.SUMA
      );
    },
  }).addTo(map);
  control_capas.addOverlay(capa_provincias, "Total de reportes de incidentes");

  // Leyenda de la capa de coropletas
  var leyenda = L.control({ position: "bottomleft" });
  leyenda.onAdd = function (map) {
    var div = L.DomUtil.create("div", "info legend");
    var limits = capa_provincias.options.limits;
    var colors = capa_provincias.options.colors;
    var labels = [];

    // Añadir el título de la leyenda
    div.innerHTML = "<strong>Reportes de Incidencias</strong><br>";

    // Añadir min y max
    div.innerHTML +=
      '<div class="labels"><div class="min">' +
      limits[0] +
      '</div><div class="max">' +
      limits[limits.length - 1] +
      "</div></div>";

    // Añadir colores y límites
    limits.forEach(function (limit, index) {
      labels.push(
        '<li style="background-color: ' +
          colors[index] +
          '"></li>' +
          "<span>" +
          limits[index] +
          "</span>"
      );
    });

    div.innerHTML += "<ul>" + labels.join("") + "</ul>";
    return div;
  };
  leyenda.addTo(map);
});
