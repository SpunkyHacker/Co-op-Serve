import {
  MapPin,
  Star,
  Briefcase,
  Clock,
  BadgeCheck,
} from "lucide-react";

import type { Worker } from "../data/workers";

type WorkerCardProps = {
  worker: Worker;
  onRequest: (worker: Worker) => void;
};

function WorkerCard({ worker, onRequest }: WorkerCardProps) {
  const isAvailable = worker.availability === "Available Now";

  return (
    <div className="worker-card">
      <div className="worker-main">
        <img
          src={worker.image}
          alt={worker.name}
          className="worker-image"
        />

        <div className="worker-info">
          <div className="worker-name-row">
            <h3>{worker.name}</h3>

            {worker.verified && (
              <BadgeCheck size={17} className="verified-icon" />
            )}
          </div>

          <p className="worker-service">{worker.service}</p>

          <div className="worker-stats">
            <span>
              <Star size={14} fill="currentColor" />
              {worker.rating} ({worker.reviews})
            </span>

            <span>
              <MapPin size={14} />
              {worker.distance} km away
            </span>

            <span>
              <Briefcase size={14} />
              {worker.jobs} jobs
            </span>
          </div>

          <div className="worker-skills">
            {worker.skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>

          <div
            className={`availability ${
              isAvailable ? "available" : "busy"
            }`}
          >
            <Clock size={13} />
            {worker.availability}
          </div>
        </div>
      </div>

      <div className="worker-right">
        <div className="worker-rate">
          <strong>₹{worker.rate}</strong>
          <span>/hr</span>
        </div>

        <p>{worker.experience} yrs experience</p>

        <button
          className="request-button"
          disabled={!isAvailable}
          onClick={() => onRequest(worker)}
        >
          {isAvailable ? "Book Again" : "Busy"}
        </button>
      </div>
    </div>
  );
}

export default WorkerCard;