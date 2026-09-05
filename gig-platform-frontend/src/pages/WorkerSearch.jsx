import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkerSearch } from '../hooks/useWorkerSearch';

export default function WorkerSearch() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    lat: 12.9165,
    lng: 79.1325,
    category: 'Plumbing',
    sortPreference: 'recommended',
    maxPrice: '',
    verifiedOnly: false
  });

  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFilters(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
        },
        (error) => {
          console.warn("Location access denied. Using default location.", error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const { workers, isLoading, error } = useWorkerSearch(filters);

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleWorkerSelection = (workerId) => {
    if (selectedWorkers.includes(workerId)) {
      setSelectedWorkers(selectedWorkers.filter(id => id !== workerId));
    } else {
      if (selectedWorkers.length >= 3) {
        alert("You can only request up to 3 workers at a time.");
        return;
      }
      setSelectedWorkers([...selectedWorkers, workerId]);
    }
  };

  const handleSendRequest = async () => {
    if (selectedWorkers.length === 0) return;
    setIsBooking(true);
    
    try {
      const res = await fetch("http://localhost:8000/api/bookings/request", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41", 
          customer_lat: filters.lat,
          customer_lng: filters.lng,
          worker_ids: selectedWorkers,
          service_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21",
          price: 500 
        })
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        alert(`Success! Invites sent to workers. Group ID: ${data.group_id}`);
        setSelectedWorkers([]);
        navigate('/booking');
      } else {
        alert("Backend rejected the request: " + JSON.stringify(data));
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert("Error Details: " + err.message); 
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="search-dashboard" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Find a Cooperative Worker Near You</h2>
      
      <p style={{ fontSize: '12px', color: '#666' }}>
        Current Location Coordinates: {filters.lat.toFixed(4)}, {filters.lng.toFixed(4)}
      </p>

      <div className="filters" style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select name="category" value={filters.category} onChange={handleFilterChange} style={{ padding: '6px' }}>
          <option value="Plumbing">Plumbing</option>
          <option value="Electrical">Electrical</option>
          <option value="Cleaning">Cleaning</option>
        </select>

        <select name="sortPreference" value={filters.sortPreference} onChange={handleFilterChange} style={{ padding: '6px' }}>
          <option value="recommended">Recommended (Default)</option>
          <option value="premium">Premium / Top Tier</option>
          <option value="budget">Budget Friendly</option>
          <option value="nearest">Nearest to Me</option>
        </select>

        <label>
          Max Price (₹/hr):
          <input 
            type="number" 
            name="maxPrice" 
            value={filters.maxPrice} 
            onChange={handleFilterChange}
            style={{ marginLeft: '5px', width: '80px', padding: '5px' }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            name="verifiedOnly" 
            checked={filters.verifiedOnly} 
            onChange={handleFilterChange} 
          />
          Verified Only
        </label>
      </div>

      {isLoading && <p>Finding the best workers nearby...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      <div className="worker-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!isLoading && workers.length === 0 && <p>No workers found matching these criteria in your area.</p>}
        
        {workers.map((worker, index) => {
          const isSelected = selectedWorkers.includes(worker.worker_id);
          
          return (
            <div key={worker.worker_id} style={{ border: isSelected ? '2px solid #28a745' : '1px solid #ddd', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isSelected ? '#f8fff9' : '#fff' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>
                  #{index + 1} {worker.full_name} 
                  {worker.is_verified && <span style={{ color: 'green', fontSize: '14px', marginLeft: '8px' }}>✓ Verified</span>}
                </h3>
                <p style={{ margin: '0', color: '#666' }}>⭐ {worker.avg_rating} ({worker.total_jobs_completed} jobs)</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#007bff' }}>📍 {worker.distance_km} km away</p>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>₹{worker.hourly_rate}/hr</h3>
                <button 
                  onClick={() => toggleWorkerSelection(worker.worker_id)}
                  style={{ 
                    padding: '8px 16px', 
                    background: isSelected ? '#28a745' : '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer' 
                  }}
                >
                  {isSelected ? 'Selected ✓' : 'Select Worker'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedWorkers.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#333', color: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', bottom: '20px' }}>
          <span>{selectedWorkers.length} worker(s) selected</span>
          <button 
            onClick={handleSendRequest} 
            disabled={isBooking}
            style={{ padding: '10px 20px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isBooking ? 'Sending...' : 'Send Request Now'}
          </button>
        </div>
      )}
    </div>
  );
}