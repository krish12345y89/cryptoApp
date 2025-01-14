import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import "./App.css"; // Import your CSS file

const socket = io("http://localhost:5000");

const App = () => {
  const [cryptoData, setCryptoData] = useState({});
  const [alertThreshold, setAlertThreshold] = useState("");
  const [result, setResult] = useState({ cryptoCurrency: "", currency: "usd" });
  const [message, setMessage] = useState("");
  const [alertMessages, setAlertMessages] = useState([]);
  const [specificPrice, setSpecificPrice] = useState(null);

  useEffect(() => {
    const userId = "defaultUser Id"; // Replace with actual user ID if available

    // Fetch user's alerts when the component mounts
    fetch(`http://localhost:5000/alerts/${userId}`)
      .then((response) => response.json())
      .then((data) => {
        const messages = data.map((alert) => ({
          message: `${alert.crypto} has crossed your threshold of ${alert.priceThreshold} ${alert.currency}.`,
          id: alert._id,
        }));
        setAlertMessages(messages);
      })
      .catch((error) => console.error("Error fetching alerts:", error));

    // Listen for cryptocurrency data updates
    socket.on("cryptoData", (data) => {
      setCryptoData(data);
    });

    // Listen for alert messages from the server
    socket.on("alert", (data) => {
      setAlertMessages((prevMessages) => [...prevMessages, data]);
    });

    return () => {
      socket.off("cryptoData");
      socket.off("alert");
    };
  }, []);

  const handleSetAlert = () => {
    if (!result.cryptoCurrency || !alertThreshold) {
      setMessage("Please select a cryptocurrency and enter a price threshold.");
      return;
    }

    const newAlert = {
      crypto: result.cryptoCurrency,
      priceThreshold: parseFloat(alertThreshold),
      userId: "defaultUser Id", // Replace with actual user ID if available
      currency: result.currency,
    };

    fetch("http://localhost:5000/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newAlert),
    })
      .then((response) => response.json())
      .then(() => {
        setAlertThreshold("");
        setMessage(`Alert set for ${result.cryptoCurrency} at ${alertThreshold} ${result.currency}.`);
      })
      .catch(() => setMessage("Error setting alert."));
  };

  const handleGetSpecificPrice = (e) => {
    e.preventDefault();
    const price = cryptoData[result.cryptoCurrency]?.[result.currency];
    if (price) {
      setSpecificPrice(price);
      setMessage("");
    } else {
      setMessage("Price not available.");
    }
  };

  const handleDeleteAlert = (id) => {
    fetch(`http://localhost:5000/alerts/${id}`, { method: "DELETE" })
      .then((response) => {
        if (response.ok) {
          setAlertMessages((prevMessages) =>
            prevMessages.filter((alert) => alert.id !== id)
          );
          setMessage("Alert deleted successfully.");
        } else {
          setMessage("Error deleting alert.");
        }
      })
      .catch(() => setMessage("Error deleting alert."));
  };

  return (
    <div className="App">
      <h1>Cryptocurrency Alert System</h1>
      <div>
        <h3>Cryptocurrency Prices</h3>
        <div className="price-container">
          {Object.keys(cryptoData).length > 0 ? (
            Object.keys(cryptoData).map((crypto) => (
              <div key={crypto} className="price-card">
                <p className="crypto-name">
                  {crypto.charAt(0).toUpperCase() + crypto.slice(1)}
                </p>
                <p className="crypto-price">
                  {cryptoData[crypto]?.usd
                    ? `USD: ${cryptoData[crypto].usd}`
                    : "Loading..."}
                  <br />
                  {cryptoData[crypto]?.inr
                    ? `INR: ${cryptoData[crypto].inr}`
                    : "Loading..."}
                  <br />
                  {cryptoData[crypto]?.eur
                    ? `EUR: ${cryptoData[crypto].eur}`
                    : "Loading..."}
                </p>
              </div>
            ))
          ) : (
            <p>Loading prices...</p>
          )}
        </div>
      </div>

      <div>
        <h3>Set Price Alert</h3>
        <label>
          Cryptocurrency:
          <select
            onChange={(e) =>
              setResult({ ...result, cryptoCurrency: e.target.value })
            }
          >
            <option value="">Select Cryptocurrency</option>
            {Object.keys(cryptoData).map((crypto) => (
              <option key={crypto} value={crypto}>
                {crypto.charAt(0).toUpperCase() + crypto.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Currency:
          <select
            value={result.currency}
            onChange={(e) =>
              setResult({ ...result, currency: e.target.value })
            }
          >
            <option value="usd">USD</option>
            <option value="inr">INR</option>
            <option value="eur">EUR</option>
          </select>
        </label>
        <label>
          Price Threshold:
          <input
            type="number"
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(e.target.value)}
          />
        </label>
        <button onClick={handleSetAlert}>Set Alert</button>
        {message && <p className="message">{message}</p>}
      </div>

      <div>
        <h3>Alert Messages</h3>
        {alertMessages.length > 0 ? (
          alertMessages.map((alert) => (
            <div key={alert.id} className="alert-message">
              <p>{alert.message}</p>
              <button onClick={() => handleDeleteAlert(alert.id)}>Delete</button>
            </div>
          ))
        ) : (
          <p>No alerts triggered yet.</p>
        )}
      </div>

      <div>
        <h3>Get Specific Price</h3>
        <form onSubmit={handleGetSpecificPrice}>
          <label>
            Cryptocurrency:
            <select
              onChange={(e) =>
                setResult({ ...result, cryptoCurrency: e.target.value })
              }
            >
              <option value="">Select Cryptocurrency</option>
              {Object.keys(cryptoData).map((crypto) => (
                <option key={crypto} value={crypto}>
                  {crypto.charAt(0).toUpperCase() + crypto.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Currency:
            <select
              value={result.currency}
              onChange={(e) =>
                setResult({ ...result, currency: e.target.value })
              }
            >
              <option value="usd">USD</option>
              <option value="inr">INR</option>
              <option value="eur">EUR</option>
            </select>
          </label>
          <button type="submit">Get Price</button>
        </form>
        {specificPrice !== null && (
          <p>
            Current Price of {result .cryptoCurrency}: {specificPrice} {result.currency}
          </p>
        )}
      </div>
    </div>
  );
};

export default App;