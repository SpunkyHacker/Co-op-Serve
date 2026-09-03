import { useState, useEffect } from 'react';

export const useWorkerSearch = (searchParams) => {
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkers = async () => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams({
          customer_lat: searchParams.lat,
          customer_lng: searchParams.lng,
          skill_category: searchParams.category,
          sort_preference: searchParams.sortPreference || 'recommended',
          ...(searchParams.gender && { req_gender: searchParams.gender }),
          ...(searchParams.language && { req_language: searchParams.language }),
          ...(searchParams.verifiedOnly && { must_be_verified: true }),
          ...(searchParams.maxPrice && { max_price: searchParams.maxPrice }),
        }).toString();

        const response = await fetch(`http://localhost:8000/api/workers/search?${query}`);
        if (!response.ok) throw new Error('Failed to fetch workers');
        
        const data = await response.json();
        setWorkers(data.results);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (searchParams.lat && searchParams.lng && searchParams.category) {
      fetchWorkers();
    }
  }, [searchParams]);

  return { workers, isLoading, error };
};