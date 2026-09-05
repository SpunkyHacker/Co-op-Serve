import React, { useState, useEffect, useRef } from 'react';

const API_BASE = "http://localhost:8000";

export default function WorkerDashboard() {
  // Input your actual worker UUID from your Supabase workers table here for testing
  const [workerId, setWorkerId] = useState("8f44277c-3693-4c47-9ca5-34fd3c949a08");
  const [incomingJob, setIncomingJob] = useState(null);
  const [activeJob, setActiveJob] = useState(null); // { booking_id, group_id, ..., status }
  const [timeLeft, setTimeLeft] = useState(120); // 2-minute expiration countdown
  const [statusMessage, setStatusMessage] = useState(null); // transient banner, e.g. "job taken by another worker"

  // Refs so interval closures always see the latest values without re-subscribing
  const incomingJobRef = useRef(incomingJob);
  useEffect(() => { incomingJobRef.current = incomingJob; }, [incomingJob]);

  // Poll for incoming jobs assigned to this worker
  useEffect(() => {
    let intervalId;
    if (workerId && !activeJob) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/workers/${workerId}/requests?worker_lat=12.9165&worker_lng=79.1325`);
          if (!res.ok) return;
          const data = await res.json();
          const pending = (data && data.requests) || [];

          if (pending.length > 0) {
            setIncomingJob(pending[0]);
            setTimeLeft(prevSecondsUntilExpiry(pending[0]));
            return;
          }

          // No pending requests came back this cycle. If we were showing one,
          // it was resolved elsewhere (accepted by another worker, or expired) - clear it.
          const stale = incomingJobRef.current;
          if (stale) {
            try {
              const trackRes = await fetch(`${API_BASE}/api/bookings/${stale.booking_id}/tracking`);
              if (trackRes.ok) {
                const trackData = await trackRes.json();
                if (trackData.status === 'accepted') {
                  setStatusMessage("That job was accepted by another worker.");
                } else if (trackData.status === 'expired' || trackData.status === 'cancelled') {
                  setStatusMessage("That job request expired.");
                }
              }
            } catch (e) {
              // ignore tracking lookup failure, still clear the stale job below
            }
            setIncomingJob(null);
          }
        } catch (err) {
          console.error("Worker poll error:", err);
        }
      }, 3000);
    }
    return () => clearInterval(intervalId);
  }, [workerId, activeJob]);

  function prevSecondsUntilExpiry(job) {
    if (!job || !job.expires_at) return 120;
    const secs = Math.round((new Date(job.expires_at).getTime() - Date.now()) / 1000);
    return Math.max(0, secs);
  }

  // Countdown timer effect
  useEffect(() => {
    if (!incomingJob) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [incomingJob]);

  // Auto-clear the status banner after a few seconds
  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(null), 5000);
    return () => clearTimeout(t);
  }, [statusMessage]);

  // Once a job is active, poll its tracking status so we know when the customer
  // has confirmed completion and paid - at which point this worker goes back to listening.
  useEffect(() => {
    if (!activeJob) return;
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/bookings/${activeJob.booking_id}/tracking`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'completed') {
          setStatusMessage("Job completed and payment received!");
          setActiveJob(null);
        }
      } catch (err) {
        console.error("Active job tracking error:", err);
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [activeJob]);

  const respondToJob = async (action) => {
    if (!incomingJob) return;
    try {
      const res = await fetch(`${API_BASE}/api/bookings/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: incomingJob.booking_id,
          worker_id: workerId,
          group_id: incomingJob.group_id,
          action
        })
      });
      const data = await res.json();

      if (action === 'accept') {
        if (data.status === 'failed') {
          setStatusMessage(data.message || "Another worker already accepted this job.");
          setIncomingJob(null);
          return;
        }
        if (data.navigation_url) {
          window.open(data.navigation_url, '_blank');
        }
        setActiveJob({ ...incomingJob, status: 'accepted' });
        setIncomingJob(null);
      } else {
        setStatusMessage("Job declined.");
        setIncomingJob(null);
      }
    } catch (error) {
      console.error("Response error", error);
    }
  };

  const markArrivedAndStart = async () => {
    if (!activeJob) return;
    try {
      await fetch(`${API_BASE}/api/bookings/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: activeJob.booking_id, status: 'in_progress' })
      });
      setActiveJob(prev => ({ ...prev, status: 'in_progress' }));
    } catch (error) {
      console.error(error);
    }
  };

  const markWorkFinished = async () => {
    if (!activeJob) return;
    try {
      await fetch(`${API_BASE}/api/bookings/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: activeJob.booking_id, status: 'work_done' })
      });
      setActiveJob(prev => ({ ...prev, status: 'work_done' }));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-800">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow-md border-t-4 border-green-500">
        <h2 className="text-2xl font-bold mb-4">Worker Portal Dashboard</h2>

        <div className="mb-6">
          <label className="block text-sm font-bold mb-1">Your Worker UUID:</label>
          <input
            type="text"
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className="w-full border p-2 rounded text-sm font-mono bg-gray-100"
          />
        </div>

        {statusMessage && (
          <div className="mb-4 p-3 rounded bg-gray-800 text-white text-sm text-center">
            {statusMessage}
          </div>
        )}

        {/* ACTIVE JOB SCREEN */}
        {activeJob ? (
          <div className="bg-blue-50 border border-blue-300 p-6 rounded shadow text-center">
            {activeJob.status === 'accepted' && (
              <>
                <h3 className="text-xl font-bold text-blue-800 mb-2">On Your Way</h3>
                <p className="text-gray-700 mb-4">Navigate to the customer, then confirm arrival to start the job.</p>
                <button
                  onClick={markArrivedAndStart}
                  className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 shadow"
                >
                  I've Arrived - Start Job
                </button>
              </>
            )}

            {activeJob.status === 'in_progress' && (
              <>
                <h3 className="text-xl font-bold text-blue-800 mb-2">Job In Progress</h3>
                <p className="text-gray-700 mb-4">Performing the service at the customer's location.</p>
                <button
                  onClick={markWorkFinished}
                  className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 shadow"
                >
                  Mark Work as Finished
                </button>
              </>
            )}

            {activeJob.status === 'work_done' && (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <h3 className="text-xl font-bold text-blue-800 mb-2">Waiting on Customer</h3>
                <p className="text-gray-700">
                  Waiting for the customer to confirm the job and complete payment.
                </p>
              </>
            )}
          </div>
        ) : !incomingJob ? (
          /* WAITING SCREEN */
          <div className="bg-gray-50 p-10 rounded text-center border">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3"></div>
            <p className="text-gray-500 font-medium">Listening for incoming job requests...</p>
          </div>
        ) : (
          /* INCOMING JOB ALERT */
          <div className="bg-yellow-50 border border-yellow-300 p-6 rounded shadow animate-pulse">
            <div className="flex justify-between items-center mb-4">
              <span className="bg-red-600 text-white text-xs px-3 py-1 rounded font-bold">
                ⏱️ Expires in: {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
              </span>
            </div>

            <h3 className="text-xl font-bold mb-2">New Service Request!</h3>
            <p className="text-gray-700"><strong>Estimated Pay:</strong> ₹{incomingJob.price ?? 500}</p>
            <p className="text-gray-700"><strong>Distance:</strong> {incomingJob.distance_km ?? '3.2'} km away</p>
            <p className="text-gray-700 mb-6"><strong>ETA:</strong> {incomingJob.eta_mins ?? '—'} mins</p>

            <div className="flex gap-4">
              <button
                onClick={() => respondToJob('accept')}
                className="flex-1 bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 shadow"
              >
                Accept & Navigate
              </button>
              <button
                onClick={() => respondToJob('reject')}
                className="flex-1 bg-red-500 text-white py-3 rounded font-bold hover:bg-red-600 shadow"
              >
                Decline
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}