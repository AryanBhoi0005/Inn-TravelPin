import "./app.css";
import ReactMapGL, { Marker, Popup } from "react-map-gl";
import { useEffect, useState } from "react";
import { Room, Star } from "@mui/icons-material";
import axios from "axios";
import Register from "./components/Register";
import Login from "./components/Login";
import "mapbox-gl/dist/mapbox-gl.css";

// Haversine formula to calculate the distance between two latitudes and longitudes
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance.toFixed(2); // Return distance rounded to 2 decimal places
};

function App() {
  const myStorage = window.localStorage;
  const [currentUsername, setCurrentUsername] = useState(myStorage.getItem("user"));
  const [pins, setPins] = useState([]);
  const [currentPlaceId, setCurrentPlaceId] = useState(null);
  const [newPlace, setNewPlace] = useState(null);
  const [title, setTitle] = useState(null);
  const [desc, setDesc] = useState(null);
  const [star, setStar] = useState(0);
  const [viewport, setViewport] = useState({
    latitude: 19.0760, // Default latitude (Mumbai)
    longitude: 72.8777, // Default longitude
    zoom: 4,
  });
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedPins, setSelectedPins] = useState([]); // Track selected pins for distance calculation
  const [distance, setDistance] = useState(null); // Store the calculated distance

  const handleMarkerClick = (id, latitude, longitude) => {
    setCurrentPlaceId(id);
    setViewport({ ...viewport, latitude: latitude, longitude: longitude });
  };

  const handleAddClick = (e) => {
    const { lng, lat } = e.lngLat;
    setNewPlace({ latitude: lat, longitude: lng });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newPin = {
      username: currentUsername,
      title,
      desc,
      rating: star,
      latitude: newPlace.latitude,
      longitude: newPlace.longitude,
    };
    try {
      const res = await axios.post(
        "https://inn-travelpin-aryanbhoi.onrender.com/api/pins/postPin",
        newPin
      );
      setPins([...pins, res.data]);
      setNewPlace(null);
    } catch (err) {
      console.error("Error posting new pin:", err);
      alert("Failed to add pin. Please try again later.");
    }
  };

  const handleSelectPin = (id, latitude, longitude) => {
    // Add or remove pins from the selection
    setSelectedPins((prevSelectedPins) => {
      const isAlreadySelected = prevSelectedPins.some(
        (pin) => pin.id === id
      );
      if (isAlreadySelected) {
        return prevSelectedPins.filter((pin) => pin.id !== id);
      } else {
        return [...prevSelectedPins, { id, latitude, longitude }];
      }
    });
  };

  useEffect(() => {
    const getPins = async () => {
      try {
        const allPins = await axios.get(
          "https://inn-travelpin-aryanbhoi.onrender.com/api/pins/getPin"
        );
        setPins(allPins.data);
      } catch (err) {
        console.error("Error fetching pins:", err);
      }
    };
    getPins();
  }, []);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setViewport((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            zoom: 14, // Adjust zoom for better visibility
          }));
        },
        (error) => {
          console.error("Error fetching location:", error);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  // Calculate distance when two pins are selected
  useEffect(() => {
    if (selectedPins.length === 2) {
      const [pin1, pin2] = selectedPins;
      const calculatedDistance = calculateDistance(
        pin1.latitude,
        pin1.longitude,
        pin2.latitude,
        pin2.longitude
      );
      setDistance(calculatedDistance);
    }
  }, [selectedPins]);

  const handleLogout = () => {
    setCurrentUsername(null);
    myStorage.removeItem("user");
  };

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <ReactMapGL
        {...viewport}
        mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
        style={{ width: "100%", height: "100%" }}
        transitionDuration="200"
        mapStyle="mapbox://styles/aryanbhoi/cm3k6ktn300nd01seedxa5sxs"
        onMove={(evt) => setViewport(evt.viewState)}
        onDblClick={currentUsername && handleAddClick}
      >
        {pins.map((p) => (
          <Marker
            key={p._id}
            latitude={p.latitude}
            longitude={p.longitude}
            offsetLeft={-3.5 * viewport.zoom}
            offsetTop={-7 * viewport.zoom}
          >
            <Room
              style={{
                fontSize: 7 * viewport.zoom,
                color: currentUsername === p.username ? "tomato" : "slateblue",
                cursor: "pointer",
              }}
              onClick={() => handleMarkerClick(p._id, p.latitude, p.longitude)}
              onDoubleClick={() =>
                handleSelectPin(p._id, p.latitude, p.longitude)
              }
            />
          </Marker>
        ))}

        {pins.map(
          (p) =>
            p._id === currentPlaceId && (
              <Popup
                key={p._id}
                latitude={p.latitude}
                longitude={p.longitude}
                closeButton={true}
                closeOnClick={false}
                onClose={() => setCurrentPlaceId(null)}
                anchor="left"
              >
                <div className="card">
                  <label>Place</label>
                  <h4 className="place">{p.title}</h4>
                  <label>Review</label>
                  <p className="desc">{p.desc}</p>
                  <label>Rating</label>
                  <div className="stars">
                    {Array.from({ length: p.rating }, (_, index) => (
                      <Star key={index} className="star" />
                    ))}
                  </div>
                  <label>Information</label>
                  <span className="username">
                    Created by <b>{p.username}</b>
                  </span>
                </div>
              </Popup>
            )
        )}

        {newPlace && (
          <>
            <Marker
              latitude={newPlace.latitude}
              longitude={newPlace.longitude}
              offsetLeft={-3.5 * viewport.zoom}
              offsetTop={-7 * viewport.zoom}
            >
              <Room
                style={{
                  fontSize: 7 * viewport.zoom,
                  color: "tomato",
                  cursor: "pointer",
                }}
              />
            </Marker>
            <Popup
              latitude={newPlace.latitude}
              longitude={newPlace.longitude}
              closeButton={true}
              closeOnClick={false}
              onClose={() => setNewPlace(null)}
              anchor="left"
            >
              <div>
                <form onSubmit={handleSubmit}>
                  <label>
                    <h2>Title</h2>
                  </label>
                  <input
                    placeholder="Enter a title"
                    autoFocus
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <label>
                    <h3>Description</h3>
                  </label>
                  <textarea
                    placeholder="Say us something about this place."
                    onChange={(e) => setDesc(e.target.value)}
                  />
                  <label>
                    <h3>Rating</h3>
                  </label>
                  <select onChange={(e) => setStar(e.target.value)}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                  <button className="submitButton" type="submit">
                    Add Pin
                  </button>
                </form>
              </div>
            </Popup>
          </>
        )}
      </ReactMapGL>
      {distance && (
        <div className="distance-display">
          <h3>Distance: {distance} km</h3>
        </div>
      )}
    </div>
  );
}

export default App;
