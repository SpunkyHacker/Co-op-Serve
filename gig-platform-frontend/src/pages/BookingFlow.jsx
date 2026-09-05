import React, { useState, useEffect } from 'react';

const API_BASE = "http://localhost:8000";

export default function BookingFlow() {
  const [view, setView] = useState('customer');

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-4 mb-8 justify-center">
          <button
            className={`px-6 py-2 rounded font-bold ${view === 'customer' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setView('customer')}
          >
            Customer View (Live Tracking)
          </button>
          <button
            className={`px-6 py-2 rounded font-bold ${view === 'worker' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setView('worker')}
          >
            Worker Action View
          </button>
        </div>

        {view === 'customer' ? <CustomerBookingView /> : <WorkerActionView />}
      </div>
    </div>
  );
}

// ==========================================
// 1. CUSTOMER VIEW (5-Step Live Tracking)
//    pending -> ongoing/en_route -> arrived -> work_done -> payment
// ==========================================
import { useLocation, useNavigate } from 'react-router-dom';

// ... (keep the main BookingFlow component as is)

function CustomerBookingView() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [bookingState, setBookingState] = useState('idle');
  const [groupId, setGroupId] = useState(location.state?.groupId || null);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [workerLocation, setWorkerLocation] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [workerDetails, setWorkerDetails] = useState([]);

  // Auto-start if we arrived from the search page
  useEffect(() => {
    if (groupId && bookingState === 'idle') {
      setBookingState('pending');
    }
  }, [groupId, bookingState]);

  // Polling loop to drive the UI state automatically
  useEffect(() => {
    let intervalId;
    
    const pollStatus = async () => {
      try {
        // If we are still pending, poll the GROUP endpoint to get all worker timers
        if (bookingState === 'pending' && groupId) {
          const res = await fetch(`${API_BASE}/api/bookings/group/${groupId}/tracking`);
          if (!res.ok) return;
          const data = await res.json();
          
          setWorkerDetails(data.details || []);

          if (data.status === 'accepted') {
            setActiveBookingId(data.booking_id);
            setBookingState('ongoing');
          } else if (data.status === 'no_workers_available') {
            setBookingState('failed');
          }
        } 
        // Once accepted, poll the SINGLE booking endpoint for live GPS/job progress
        else if (activeBookingId && bookingState !== 'payment' && bookingState !== 'failed') {
          const res = await fetch(`${API_BASE}/api/bookings/${activeBookingId}/tracking`);
          if (!res.ok) return;
          const data = await res.json();

          if (data.status === 'en_route') {
            setBookingState('en_route');
            if (data.worker_live_lat && data.worker_live_lng) {
              setWorkerLocation({ lat: data.worker_live_lat, lng: data.worker_live_lng });
            }
          } else if (data.status === 'in_progress') {
            setBookingState('arrived');
          } else if (data.status === 'work_done') {
            setBookingState('work_done');
          } else if (data.status === 'completed_pending_payment') {
            setBookingState('payment');
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    if (bookingState !== 'idle' && bookingState !== 'payment' && bookingState !== 'failed') {
      pollStatus(); // run immediately
      intervalId = setInterval(pollStatus, 3000);
    }
    return () => clearInterval(intervalId);
  }, [activeBookingId, bookingState, groupId]);

  const confirmJobComplete = async () => { /* keep existing logic */ };

  // Helper component for live countdown timer
  const Countdown = ({ expiresAt }) => {
    const [left, setLeft] = useState(0);
    useEffect(() => {
      const interval = setInterval(() => {
        const secs = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
        setLeft(secs);
      }, 1000);
      return () => clearInterval(interval);
    }, [expiresAt]);
    return <span>{Math.floor(left / 60)}:{left % 60 < 10 ? '0' : ''}{left % 60}</span>;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500">
      <h2 className="text-2xl font-bold mb-4">Customer Live Tracking Dashboard</h2>

      {bookingState === 'idle' && (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No active booking. Go to search to find workers.</p>
          <button onClick={() => navigate('/search')} className="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700">
            Find Workers
          </button>
        </div>
      )}

      {/* STEP 1: Pending with Timers */}
      {bookingState === 'pending' && (
        <div className="py-6">
          <div className="text-center mb-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <h3 className="text-xl font-bold">Waiting for a worker to accept...</h3>
          </div>
          
          <div className="space-y-3">
            {workerDetails.map((worker) => (
              <div key={worker.booking_id} className="border p-4 rounded flex justify-between items-center bg-gray-50">
                <span className="font-bold">{worker.worker_name}</span>
                {worker.status === 'pending' ? (
                  <span className="text-blue-600 font-mono font-bold bg-blue-100 px-3 py-1 rounded">
                    ⏳ <Countdown expiresAt={worker.expires_at} />
                  </span>
                ) : (
                  <span className={`font-bold px-3 py-1 rounded text-sm ${worker.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>
                    {worker.status.toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAILED: All workers declined or expired */}
      {bookingState === 'failed' && (
        <div className="text-center py-10">
          <h3 className="text-2xl font-bold text-red-600 mb-2">No Workers Available</h3>
          <p className="text-gray-600 mb-6">The workers you selected are currently unavailable or the requests expired.</p>
          <button onClick={() => navigate('/search')} className="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700">
            Search For Another Worker
          </button>
        </div>
      )}

      {/* (Keep your existing STEP 2, 3, 3.5, and 4 blocks here exactly as they were...) */}
    </div>
  );
}

// ==========================================
// 2. WORKER ACTION VIEW (dev/test mirror of WorkerDashboard.jsx)
// ==========================================
function WorkerActionView() {
  const [workerId, setWorkerId] = useState("0bdb4547-9fb2-4fb2-b319-1b70ad15022b");
  const [incomingJob, setIncomingJob] = useState(null);
  const [activeJob, setActiveJob] = useState(null); // { booking_id, group_id, status, ... }
  const [timeLeft, setTimeLeft] = useState(120);

  // Poll for incoming pending jobs assigned to this worker
  useEffect(() => {
    let intervalId;
    if (workerId && !activeJob) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/workers/${workerId}/incoming`);
          if (!res.ok) return;
          const data = await res.json();
          if (data && data.booking_id) {
            setIncomingJob(data);
          }
        } catch (err) {
          console.error("Worker poll error:", err);
        }
      }, 3000);
    }
    return () => clearInterval(intervalId);
  }, [workerId, activeJob]);

  // Countdown timer effect
  useEffect(() => {
    if (!incomingJob) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [incomingJob]);

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

      if (action === 'accept' && data.navigation_url) {
        window.open(data.navigation_url, '_blank');
        setActiveJob({ ...incomingJob, status: 'accepted' });
        setIncomingJob(null);
      } else {
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
    <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-500">
      <h2 className="text-2xl font-bold mb-4">Worker Portal</h2>

      <div className="mb-6">
        <label className="block text-sm font-bold mb-1">Test Worker UUID (Paste yours from Supabase):</label>
        <input
          type="text"
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          className="w-full border p-2 rounded text-sm font-mono"
        />
      </div>

      {activeJob ? (
        <div className="bg-blue-50 border border-blue-300 p-6 rounded shadow text-center">
          {activeJob.status === 'accepted' && (
            <>
              <h3 className="text-lg font-bold text-blue-800 mb-3">On Your Way</h3>
              <button onClick={markArrivedAndStart} className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700">
                I've Arrived - Start Job
              </button>
            </>
          )}
          {activeJob.status === 'in_progress' && (
            <>
              <h3 className="text-lg font-bold text-blue-800 mb-3">Job In Progress</h3>
              <button onClick={markWorkFinished} className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700">
                Mark Work as Finished
              </button>
            </>
          )}
          {activeJob.status === 'work_done' && (
            <p className="text-gray-700">Waiting for customer to confirm and pay...</p>
          )}
        </div>
      ) : !incomingJob ? (
        <div className="bg-gray-50 p-8 rounded text-center border">
          <p className="text-gray-500">Listening for incoming job requests...</p>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-300 p-6 rounded shadow">
          <div className="flex justify-between items-center mb-4">
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold animate-pulse">
              ⏱️ Expires in: {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
            </span>
          </div>

          <h3 className="text-xl font-bold mb-2">Incoming Plumbing Service Request</h3>
          <p className="text-gray-700"><strong>Estimated Pay:</strong> ₹500</p>
          <p className="text-gray-700 mb-4"><strong>Distance:</strong> {incomingJob.distance_km || '3.2'} km away</p>

          <div className="flex gap-4">
            <button onClick={() => respondToJob('accept')} className="flex-1 bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700">
              Accept Job & Navigate
            </button>
            <button onClick={() => respondToJob('reject')} className="flex-1 bg-red-500 text-white py-3 rounded font-bold hover:bg-red-600">
              Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. PAYMENT PORTAL
// ==========================================
function PaymentPortal({ bookingId, onComplete }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const submitPayment = async () => {
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/api/bookings/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          worker_id: "22555ddb-04ee-470b-b593-9e59ae5e956a",
          payment_amount: 500,
          payment_method: "upi",
          rating_given: rating,
          review_text: review
        })
      });
      alert("Payment Successful! Job fully completed.");
      onComplete();
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border-t-4 border-yellow-400 p-6 rounded shadow mt-6">
      <h3 className="text-2xl font-bold mb-4">Step 4: Job Complete & Payment Portal</h3>
      <p className="text-gray-600 mb-4">Please complete the payment and rate your worker.</p>

      <div className="mb-4">
        <label className="block font-bold mb-1">Rating: {rating} ★</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} onClick={() => setRating(star)} className={`text-2xl ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
          ))}
        </div>
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Leave a review (optional)"
        className="w-full border p-2 rounded mb-4 text-sm"
        rows={3}
      />

      <button
        onClick={submitPayment}
        disabled={isProcessing}
        className="w-full bg-yellow-500 text-white py-3 rounded font-bold hover:bg-yellow-600"
      >
        {isProcessing ? 'Processing...' : 'Pay ₹500 & Finish'}
      </button>
    </div>
  );
}