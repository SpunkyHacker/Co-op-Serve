import React, { useState, useEffect } from 'react';
import { useWorkerSearch } from '../hooks/useWorkerSearch';

export default function WorkerSearch() {
  const [filters, setFilters] = useState({
    lat: 12.9165,
    lng: 79.1325,
    category: 'Plumbing',
    sortPreference: 'recommended',
    maxPrice: '',
    verifiedOnly: false
  });

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
        
        {workers.map((worker, index) => (
          <div key={worker.worker_id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
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
              <button style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}