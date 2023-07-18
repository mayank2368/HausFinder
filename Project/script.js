// Add a global variable to store the current transportation mode
let currentMode = "walking";

// The value for 'accessToken' begins with 'pk...'
mapboxgl.accessToken =
  "pk.eyJ1IjoiaGFzYW4wOTciLCJhIjoiY2xqanVudDFlMGF1cTNqcGQ2amFwb3VwayJ9.tQcubUOLwD3k26dnXOYj1A";
const map = new mapboxgl.Map({
  container: "map",
  // Replace YOUR_STYLE_URL with your style URL.
  style: "mapbox://styles/hasan097/cljn622n400dl01pq8f5b59pa",
  center: [9.680845, 50.555809],
  zoom: 11.7,
});

// Keep track of the current popup
let currentPopup = null;

// Code from the next step will go here.
/* 
Add an event listener that runs
when a user hovers over the map element.
*/
createPopup("wg-v2");
createPopup("dorm-v2");
createPopup("studio-v2");

// ******************************* SEARCH BAR CODE
const geocoder = new MapboxGeocoder({
  // Initialize the geocoder
  accessToken: mapboxgl.accessToken, // Set the access token
  mapboxgl: mapboxgl, // Set the mapbox-gl instance
  marker: false, // Do not use the default marker style
  placeholder: "Search for places in Fulda", // Placeholder text for the search bar
  //bbox: [-87.661557, 41.893748, -87.661557, 41.893748],
  // proximity: {
  //     longitude: -87.661557,
  //     latitude: 41.893748
  // } // Coordinates of UC Berkeley
});

// Add the geocoder to the map
map.addControl(geocoder);

// After the map style has loaded on the page,
// add a source layer and default styling for a single point
map.on("load", () => {
  map.addSource("single-point", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  });

  map.addLayer({
    id: "point",
    source: "single-point",
    type: "circle",
    paint: {
      "circle-radius": 5,
      "circle-color": "#448ee4",
    },
  });

  // Listen for the `result` event from the Geocoder // `result` event is triggered when a user makes a selection
  //  Add a marker at the result's coordinates
  geocoder.on("result", (event) => {
    map.getSource("single-point").setData(event.result.geometry);
  });
});

//************************ DIRECTIONS API

// an arbitrary start will always be the same
// only the end or destination will change
const end = [9.6842208, 50.5650941];

// create a function to make a directions request
async function getRoute(start, mode) {
  debugger;
  // make a directions request using cycling profile
  // an arbitrary start will always be the same
  // only the end or destination will change
  const query = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/${mode}/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
    { method: "GET" }
  );
  console.log();
  const json = await query.json();
  const data = json.routes[0];
  const route = data.geometry.coordinates;
  const geojson = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: route,
    },
  };
  // if the route already exists on the map, we'll reset it using setData
  if (map.getSource("route")) {
    map.getSource("route").setData(geojson);
  }
  // otherwise, we'll make a new request
  else {
    map.addLayer({
      id: "route",
      type: "line",
      source: {
        type: "geojson",
        data: geojson,
      },
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#3887be",
        "line-width": 4,
        "line-opacity": 0.75,
      },
    });
  }
  // add turn instructions here at the end

  // get the sidebar and add the instructions
  const instructions = document.getElementById("instructions");
  const steps = data.legs[0].steps;

  let tripInstructions = "";
  for (const step of steps) {
    tripInstructions += `<li>${step.maneuver.instruction}</li>`;
  }
  instructions.innerHTML = `<p><strong>Trip duration: ${Math.floor(
    data.duration / 60
  )}  min <br>
  Distance to campus: ${Math.floor(
    data.distance / 1000
  )} km </strong></p><ol>${tripInstructions}</ol>`;
}

map.on("load", () => {
  // make an initial directions request that
  // starts and ends at the same location
  getRoute(end, currentMode);

  // Add starting point to the map
  map.addLayer({
    id: "end",
    type: "circle", // Change the type to 'symbol'
    source: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: coords,
            },
          },
        ],
      },
    },
    // layout: {
    //     'icon-image': 'uni.svg', // Replace 'your-icon-image' with the actual name of your icon image
    //     'icon-size': 1.5, // Adjust the size of the icon if needed
    //     'icon-anchor': 'bottom' // Adjust the anchor position if needed
    // },
    // paint: {}
  });
  // this is where the code from the next step will go
});

// DISTANCE TO CAMPUS FUNCTION
function distanceToCampus(feature) {
  const coords = Object.keys(feature.geometry.coordinates).map(
    (key) => feature.geometry.coordinates[key]
  );
  const end = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: coords,
        },
      },
    ],
  };

  if (map.getLayer("end")) {
    map.getSource("end").setData(end);
  } else {
    map.addLayer({
      id: "end",
      type: "circle",
      source: {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: coords,
              },
            },
          ],
        },
      },
      paint: {
        "circle-radius": 5,
        "circle-color": "#f30",
      },
    });
  }
  getRoute(coords, currentMode);
}

function createPopup(type) {
  map.on("click", type, (event) => {
    // If the user hovered over one of your markers, get its information.
    const feature = event.features[0];

    // Close the current popup if it exists
    if (currentPopup) {
      currentPopup.remove();
    }

    // Create a new popup and set its properties
    const popup = new mapboxgl.Popup({
      offset: [0, -15],
      maxHeight: "300px",
      maxWidth: "300px",
      className: "custom-popup",
    })
      .setLngLat(feature.geometry.coordinates)
      .setHTML(
        `<h3>${feature.properties.Name}</h3>
        <hr>
              <img src="${feature.properties.Image}" width=270px height=150px>
              <strong>Address:</strong><p>${feature.properties.Address}</p>
              <strong>Description:</strong><p>${feature.properties.Description}</p>
              <strong>Rent:</strong><p>${feature.properties.Rent}</p>
              <strong>Amenities:</strong><p>${feature.properties.Amenities}</p>`
      )
      .addTo(map);

    // Update the current popup
    currentPopup = popup;

    distanceToCampus(feature);
  });
}

// Add a click event listener to the Get Directions button// Get the mode-select element
const modeSelect = document.getElementById("mode-select");

// Add an event listener to listen for changes in the selected option
modeSelect.addEventListener("change", function () {
  // Get the value of the selected option
  const selectedOption = modeSelect.value;
  currentMode = selectedOption;
  // Print the selected option in the console
  console.log(currentMode);
  getRoute(end, currentMode);
});