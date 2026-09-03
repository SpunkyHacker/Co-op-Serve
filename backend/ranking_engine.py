import heapq
from typing import List, Dict, Any

class ConsumerCentricRankingEngine:
    def __init__(self, platform_avg_rating: float = 4.2, bayes_min_jobs: int = 15):
        self.C = platform_avg_rating
        self.m = bayes_min_jobs
        
        # Experience removed; weights redistributed to emphasize Quality and Trust
        self.weight_profiles = {
            "recommended": {"d": 0.20, "p": 0.20, "q": 0.35, "t": 0.25},
            "premium":     {"d": 0.10, "p": 0.05, "q": 0.55, "t": 0.30},
            "budget":      {"d": 0.15, "p": 0.60, "q": 0.15, "t": 0.10},
            "nearest":     {"d": 0.60, "p": 0.15, "q": 0.15, "t": 0.10}
        }

    def rank_workers(
        self, 
        candidates: List[Dict[str, Any]], 
        max_search_radius_km: float, 
        sort_preference: str = "recommended",
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        
        if not candidates:
            return []

        weights = self.weight_profiles.get(sort_preference, self.weight_profiles["recommended"])
        
        # Calculate dynamic price bounds for the current local market batch
        prices = [c["hourly_rate"] for c in candidates]
        p_min, p_max = min(prices), max(prices)

        scored_candidates = []

        for w in candidates:
            # 1. Distance Score
            d = w["distance_km"]
            s_dist = max(0.0, 1.0 - (d / max_search_radius_km)) if max_search_radius_km > 0 else 0.0

            # 2. Price Score
            rate = float(w["hourly_rate"])
            s_price = 1.0 if p_max == p_min else (p_max - rate) / (p_max - p_min)

            # 3. Quality Score (Bayesian)
            jobs = w.get("total_jobs_completed", 0)
            rating = float(w.get("avg_rating", self.C))
            bayes_rating = (jobs * rating + self.m * self.C) / (jobs + self.m)
            s_qual = (bayes_rating - 1.0) / 4.0 

            # 4. Trust & Reliability Score
            verified_bonus = 1.0 if w.get("is_verified") else 0.0
            job_volume_score = min(1.0, jobs / 100.0)
            # Heavy weighting on actual job completion vs just holding a certificate
            s_trust = (0.7 * job_volume_score) + (0.3 * verified_bonus)

            # Composite Score (4 Factors)
            final_score = (
                weights["d"] * s_dist +
                weights["p"] * s_price +
                weights["q"] * s_qual +
                weights["t"] * s_trust
            )

            scored_candidates.append({
                "worker_id": w["worker_id"],
                "full_name": w["full_name"],
                "hourly_rate": rate,
                "avg_rating": round(rating, 2),
                "total_jobs": jobs,
                "distance_km": round(d, 2),
                "is_verified": w["is_verified"],
                "final_score": round(final_score, 4)
            })

        # Return Top K using Min-Heap optimization
        return heapq.nlargest(top_k, scored_candidates, key=lambda x: x["final_score"])